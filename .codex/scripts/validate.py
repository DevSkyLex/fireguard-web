"""Validate local Codex manifests, skills, references and vendor integrity (Python 3.11+)."""
from pathlib import Path
import hashlib
import json
import re
import tomllib


def file_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


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
    assert not {'model', 'approval_policy', 'sandbox_mode', 'projects'} & config.keys(), 'Project config overrides user policy'
    agents = []
    for path in sorted((root / '.codex/agents').glob('*.toml')):
        agent = tomllib.loads(path.read_text(encoding='utf-8'))
        assert all(isinstance(agent.get(key), str) and agent[key] for key in ['name', 'description', 'developer_instructions']), path
        assert agent['name'] not in agents, f'Duplicate agent: {agent["name"]}'
        assert 'model' not in agent, f'Forced model: {path.name}'
        agents.append(agent['name'])
        for relative in re.findall(r'\.agents/skills/[\w-]+/SKILL\.md', agent['developer_instructions']):
            assert (root / relative).is_file(), f'Missing agent procedure: {relative}'
    hooks = json.loads((root / '.codex/hooks.json').read_text(encoding='utf-8'))['hooks']
    assert {'PreToolUse', 'PostToolUse'} <= hooks.keys()
    for groups in hooks.values():
        for group in groups:
            re.compile(group['matcher'])
            assert group['hooks'] and all(hook['type'] == 'command' for hook in group['hooks'])
    legacy_references = find_legacy_references(root)
    assert not legacy_references, f'Legacy client paths: {legacy_references}'
    lock = json.loads((root / '.agents/skills.lock.json').read_text(encoding='utf-8'))
    for package in lock['packages']:
        folder = skills_root / package['name']
        actual = {path.relative_to(folder).as_posix(): file_hash(path) for path in folder.rglob('*') if path.is_file() and '__pycache__' not in path.parts and path.suffix != '.pyc'}
        assert actual == package['files'], f'Upstream payload changed: {package["name"]}'
        assert file_hash(root / package['license']) == package['license_sha256']
        for relative, expected in package.get('registered_agents', {}).items():
            assert file_hash(root / relative) == expected, f'Upstream agent changed: {relative}'
    return {'skills':len(skill_names), 'agents':len(agents), 'vendor_packages':len(lock['packages']), 'status':'PASS'}


if __name__ == '__main__':
    print(json.dumps(validate(Path(__file__).resolve().parents[2]), indent=2))
