"""Validate local Codex manifests, skills, references and vendor integrity (Python 3.11+)."""
from pathlib import Path
import hashlib
import json
import re
import tomllib

from check_links import check_links

from agent_profiles import (
    load_profiles, validate_global_policy, validate_native_agent, validate_native_references,
    validate_profile_coverage,
)


def file_hash(path: Path, policy: dict | None = None) -> str:
    """Hash declared UTF-8 text with LF endings; preserve every other byte."""
    content = path.read_bytes()
    if policy and path.suffix.lower() in policy['text_extensions']:
        content = content.decode('utf-8').replace('\r\n', '\n').encode('utf-8')
    return hashlib.sha256(content).hexdigest()


def validate_hash_policy(lock: dict) -> dict:
    """Reject unknown lock conventions instead of silently changing integrity semantics."""
    policy = lock.get('hashing', {})
    if (lock.get('schema_version') != 2 or policy.get('algorithm') != 'sha256'
            or policy.get('text_normalization') != 'utf8-lf'):
        raise ValueError('Unsupported skill lock schema or hash policy')
    extensions = policy.get('text_extensions')
    if not isinstance(extensions, list) or not extensions or any(
            not isinstance(extension, str) or not re.fullmatch(r'\.[a-z]+', extension)
            for extension in extensions):
        raise ValueError('Skill lock must declare its normalized text extensions')
    return policy


def validate_package(root: Path, package: dict, policy: dict) -> None:
    """Check the full installed file set, license and registered agent copies."""
    folder = root / '.agents/skills' / package['name']
    actual = {
        path.relative_to(folder).as_posix(): file_hash(path, policy)
        for path in folder.rglob('*')
        if path.is_file() and '__pycache__' not in path.parts and path.suffix != '.pyc'
    }
    if actual != package['files']:
        changed = sorted(set(actual) ^ set(package['files']) | {
            file for file in actual.keys() & package['files'].keys()
            if actual[file] != package['files'][file]
        })
        raise ValueError(f'Upstream payload changed: {package["name"]}: {", ".join(changed)}')
    if file_hash(root / package['license'], policy) != package['license_sha256']:
        raise ValueError(f'Upstream license changed: {package["name"]}')
    for relative, expected in package.get('registered_agents', {}).items():
        if file_hash(root / relative, policy) != expected:
            raise ValueError(f'Upstream agent changed: {relative}')


def find_legacy_references(root: Path) -> list[str]:
    forbidden = re.compile(rb'[.]claude\b', re.I)
    return [
        path.relative_to(root).as_posix()
        for folder in [root / '.codex', root / '.agents']
        for path in folder.rglob('*')
        if path.is_file() and '__pycache__' not in path.parts and path.suffix != '.pyc'
        and not path.name.startswith('.env') and forbidden.search(path.read_bytes())
    ]


def validate(root: Path) -> dict:
    skills_root = root / '.agents/skills'
    skill_names = set()
    for skill in sorted(skills_root.iterdir()):
        if not skill.is_dir():
            continue
        text = (skill / 'SKILL.md').read_text(encoding='utf-8')
        frontmatter = re.match(r'^---\r?\n(.*?)\r?\n---', text, re.S)
        assert frontmatter, f'Missing frontmatter: {skill.name}'
        fields = frontmatter.group(1)
        name_match = re.search(r'^name:\s*[\"\']?([a-z0-9-]+)', fields, re.M)
        assert name_match and name_match.group(1) == skill.name, f'Invalid skill name: {skill.name}'
        assert re.search(r'^description:\s*\S', fields, re.M), f'Missing description: {skill.name}'
        assert skill.name not in skill_names, f'Duplicate skill: {skill.name}'
        skill_names.add(skill.name)
        if skill.name.startswith('fg-web-'):
            for match in re.finditer(r'\]\(([^)]+\.md)\)', text):
                assert (skill / match.group(1)).is_file(), f'Broken reference in {skill.name}: {match.group(1)}'
            assert (skill / 'agents/openai.yaml').is_file(), f'Missing Codex metadata: {skill.name}'
    config = tomllib.loads((root / '.codex/config.toml').read_text(encoding='utf-8'))
    validate_global_policy(config)
    agents = []
    for path in sorted((root / '.codex/agents').glob('*.toml')):
        agent = tomllib.loads(path.read_text(encoding='utf-8'))
        assert all(isinstance(agent.get(key), str) and agent[key] for key in ['name', 'description', 'developer_instructions']), path
        assert agent['name'] not in agents, f'Duplicate agent: {agent["name"]}'
        validate_native_agent(agent, path.name)
        agents.append(agent['name'])
        validate_native_references(agent['developer_instructions'], root)
    profiles = load_profiles(root / '.codex/agent-profiles.toml')
    validate_profile_coverage(profiles, set(agents))
    check_links(root)
    hooks = json.loads((root / '.codex/hooks.json').read_text(encoding='utf-8'))['hooks']
    assert {'PreToolUse', 'PostToolUse'} <= hooks.keys()
    for groups in hooks.values():
        for group in groups:
            re.compile(group['matcher'])
            assert group['hooks'] and all(hook['type'] == 'command' for hook in group['hooks'])
    legacy_references = find_legacy_references(root)
    assert not legacy_references, f'Legacy client paths: {legacy_references}'
    lock = json.loads((root / '.agents/skills.lock.json').read_text(encoding='utf-8'))
    policy = validate_hash_policy(lock)
    for package in lock['packages']:
        validate_package(root, package, policy)
    return {'skills':len(skill_names), 'agents':len(agents), 'vendor_packages':len(lock['packages']), 'status':'PASS'}


if __name__ == '__main__':
    print(json.dumps(validate(Path(__file__).resolve().parents[2]), indent=2))
