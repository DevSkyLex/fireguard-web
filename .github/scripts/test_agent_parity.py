"""Check frontmatter, read-only tools, independence and project Fast settings."""
from pathlib import Path
import tempfile
import unittest

from check_agent_parity import claude_fields, validate_claude


def fields(name='fg-api-example-reviewer'):
    return {'name': name, 'description': 'Review', 'tools': 'Skill, Read, Grep, Glob, Bash',
            'model': 'sonnet', 'effort': 'high'}


class ClaudePolicyTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)

    def test_valid_native_fields(self):
        for model, effort in [('sonnet', 'medium'), ('sonnet', 'high'), ('opus', 'high'), ('opus', 'xhigh')]:
            data = fields()
            data.update(model=model, effort=effort)
            validate_claude(data, 'Assigned review.', self.root)

    def test_unknown_inherited_and_missing_model_effort_are_rejected(self):
        for key, value in [('model', 'inherit'), ('model', 'luna'), ('effort', ''), ('effort', 'max')]:
            data = fields()
            data[key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                validate_claude(data, '', self.root)

    def test_read_only_roles_cannot_write_or_delegate(self):
        for tool in ['Edit', 'Write', 'NotebookEdit', 'Agent', 'Task']:
            data = fields()
            data['tools'] += ', ' + tool
            with self.subTest(tool=tool), self.assertRaisesRegex(ValueError, 'Read-only'):
                validate_claude(data, '', self.root)
        data = fields('fg-api-example-builder')
        data['tools'] += ', Edit, Write'
        validate_claude(data, '', self.root)

    def test_no_codex_agent_import_or_automatic_challenge(self):
        for text in ['Read .codex/agents/fg-api-example.toml.', 'codex exec -m gpt-6-luna', 'cd fireguard-api && codex exec review']:
            with self.subTest(text=text), self.assertRaises(ValueError):
                validate_claude(fields(), text, self.root)

    def test_missing_resource_and_fast_frontmatter_are_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Missing Claude resource'):
            validate_claude(fields(), 'Read .claude/skills/missing/SKILL.md.', self.root)
        for key in ['fastMode', 'fast_mode', 'service_tier', 'model_reasoning_effort', 'permissionMode']:
            data = fields()
            data[key] = 'true'
            with self.assertRaises(ValueError):
                validate_claude(data, '', self.root)

    def test_duplicate_frontmatter_is_rejected(self):
        self.assertEqual(claude_fields('---\nname: example\nmodel: sonnet\n---\nBody')['model'], 'sonnet')
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            claude_fields('---\nmodel: sonnet\nmodel: opus\n---\n')
        with self.assertRaisesRegex(ValueError, 'Missing'):
            claude_fields('No frontmatter')


if __name__ == '__main__':
    unittest.main()
