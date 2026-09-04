from pathlib import Path
import json
import os
import subprocess
import tempfile
import unittest

from validate import find_legacy_references

REPO = Path(__file__).resolve().parents[2]
SCRIPTS = REPO / '.agents/skills/impeccable/scripts'
LEGACY_CLIENT = 'claude'


class VendorPathTests(unittest.TestCase):
    def test_scans_vendor_files_and_configuration(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for relative in ['.codex/example.json', '.agents/skills/vendor/scripts/example.mjs']:
                path = root / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(f'.{LEGACY_CLIENT}/settings.json', encoding='utf-8')
            self.assertEqual(len(find_legacy_references(root)), 2)

    def test_codex_hooks_and_shortcuts_leave_other_client_untouched(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'package.json').write_text('{}', encoding='utf-8')
            (root / '.agents/skills/impeccable').mkdir(parents=True)
            legacy = root / f'.{LEGACY_CLIENT}'
            (legacy / 'skills/impeccable').mkdir(parents=True)
            settings = legacy / 'settings.local.json'
            original = b'{"sentinel": "preserve"}\n'
            settings.write_bytes(original)
            manifest = root / '.codex/hooks.json'
            manifest.parent.mkdir()
            existing_hook = {'matcher': 'Bash', 'hooks': [{'type': 'command', 'command': 'echo existing-guard'}]}
            manifest.write_text(json.dumps({'hooks': {'PreToolUse': [existing_hook]}}), encoding='utf-8')
            env = {**os.environ, 'OPENCODE_CONFIG_DIR': str(root / 'unused-opencode')}

            def run(script, *args):
                result = subprocess.run(['node', str(SCRIPTS / script), *args], cwd=root, env=env,
                                        capture_output=True, text=True, encoding='utf-8', timeout=15)
                self.assertEqual(result.returncode, 0, result.stderr)

            run('hook-admin.mjs', 'on')
            updated = json.loads(manifest.read_text(encoding='utf-8'))
            self.assertEqual(updated['hooks']['PreToolUse'], [existing_hook])
            self.assertIn('PostToolUse', updated['hooks'])
            self.assertIn('Stop', updated['hooks'])
            self.assertEqual(settings.read_bytes(), original)
            run('pin.mjs', 'pin', 'audit')
            self.assertTrue((root / '.agents/skills/audit/SKILL.md').is_file())
            self.assertFalse((legacy / 'skills/audit').exists())
            run('pin.mjs', 'unpin', 'audit')
            self.assertFalse((root / '.agents/skills/audit').exists())
            self.assertEqual(settings.read_bytes(), original)


if __name__ == '__main__':
    unittest.main()
