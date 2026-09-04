from pathlib import Path
import tomllib
import unittest

from configure import bind_config


class ConfigureTests(unittest.TestCase):
    def test_preserves_user_options_and_unrelated_servers(self):
        source = """web_search = "live"
model = "user-choice"
[mcp_servers.angular]
cwd = "old"
args = ["--read-only"]
[mcp_servers.personal]
cwd = "keep"
"""
        root = Path.cwd() / 'checkout with spaces'
        result = tomllib.loads(bind_config(source, root))
        self.assertEqual(result['model'], 'user-choice')
        self.assertEqual(result['mcp_servers']['angular']['cwd'], root.resolve().as_posix())
        self.assertEqual(result['mcp_servers']['angular']['args'], ['--read-only'])
        self.assertEqual(result['mcp_servers']['personal']['cwd'], 'keep')

    def test_updates_serena_project_and_is_idempotent(self):
        source = """[mcp_servers."serena-web"]
args = ["start-mcp-server", "--project", "old", "--context", "ide"]
cwd = "old"
"""
        root = Path.cwd() / 'another checkout'
        result = bind_config(source, root)
        self.assertEqual(bind_config(result, root), result)
        parsed = tomllib.loads(result)['mcp_servers']['serena-web']
        self.assertEqual(parsed['args'][2], parsed['cwd'])
        self.assertEqual(parsed['args'][3:], ['--context', 'ide'])

    def test_invalid_toml_fails_before_rewriting(self):
        with self.assertRaises(tomllib.TOMLDecodeError):
            bind_config('[broken', Path.cwd())


if __name__ == '__main__':
    unittest.main()
