from pathlib import Path
import tempfile
import unittest

from validate import file_hash, validate_hash_policy, validate_package

POLICY = {'algorithm': 'sha256', 'text_normalization': 'utf8-lf', 'text_extensions': ['.md', '.txt', '.toml']}


class IntegrityTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.payload = self.root / '.agents/skills/example/SKILL.md'
        self.payload.parent.mkdir(parents=True)
        self.payload.write_bytes(b'First line\nSecond line\n')
        self.license = self.root / 'license.txt'
        self.license.write_bytes(b'License\n')
        self.agent = self.root / 'agent.toml'
        self.agent.write_bytes(b'name = "example"\n')
        self.package = {
            'name': 'example', 'files': {'SKILL.md': file_hash(self.payload, POLICY)},
            'license': 'license.txt', 'license_sha256': file_hash(self.license, POLICY),
            'registered_agents': {'agent.toml': file_hash(self.agent, POLICY)},
        }

    def test_lf_and_crlf_text_have_the_same_hash(self):
        for file in [self.payload, self.license, self.agent]:
            file.write_bytes(file.read_bytes().replace(b'\n', b'\r\n'))
        validate_package(self.root, self.package, POLICY)

    def test_binary_and_undeclared_formats_are_byte_exact(self):
        binary = self.root / 'image.bin'
        binary.write_bytes(b'\x00A\r\nB')
        before = file_hash(binary, POLICY)
        binary.write_bytes(b'\x00A\nB')
        self.assertNotEqual(before, file_hash(binary, POLICY))

    def test_semantic_changes_are_rejected(self):
        self.payload.write_bytes(b'First line\nDifferent line\n')
        with self.assertRaisesRegex(ValueError, 'SKILL.md'):
            validate_package(self.root, self.package, POLICY)

    def test_added_files_are_rejected(self):
        (self.payload.parent / 'unexpected.md').write_bytes(b'Unexpected')
        with self.assertRaisesRegex(ValueError, 'unexpected.md'):
            validate_package(self.root, self.package, POLICY)

    def test_removed_files_are_rejected(self):
        self.payload.unlink()
        with self.assertRaisesRegex(ValueError, 'SKILL.md'):
            validate_package(self.root, self.package, POLICY)

    def test_license_and_registered_agent_changes_are_rejected(self):
        for file, label in [(self.license, 'license'), (self.agent, 'agent')]:
            with self.subTest(file=file):
                original = file.read_bytes()
                file.write_bytes(original + b'changed')
                with self.assertRaisesRegex(ValueError, label):
                    validate_package(self.root, self.package, POLICY)
                file.write_bytes(original)

    def test_unknown_schema_or_normalization_is_rejected(self):
        for lock in [{'schema_version': 1}, {'schema_version': 2, 'hashing': {**POLICY, 'text_normalization': 'unknown'}}]:
            with self.assertRaises(ValueError):
                validate_hash_policy(lock)
        self.assertEqual(validate_hash_policy({'schema_version': 2, 'hashing': POLICY}), POLICY)


if __name__ == '__main__':
    unittest.main()
