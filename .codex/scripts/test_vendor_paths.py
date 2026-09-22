from pathlib import Path
import tempfile
import unittest

from validate import find_legacy_references

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


if __name__ == '__main__':
    unittest.main()
