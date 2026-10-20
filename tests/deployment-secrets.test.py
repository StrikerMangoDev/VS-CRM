import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("fetch_secrets", Path(__file__).resolve().parents[1] / "deploy/fetch-secrets.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
public_spec = importlib.util.spec_from_file_location("public_env", Path(__file__).resolve().parents[1] / "deploy/public-env.py")
public = importlib.util.module_from_spec(public_spec)
public_spec.loader.exec_module(public)


class SecretsTest(unittest.TestCase):
    def test_public_configuration_rejects_all_dotenv_secret_forms(self):
        for line in ["SMTP_PASSWORD=fixture", "SMTP_PASSWORD = fixture", "export SMTP_PASSWORD=fixture", "  SMTP_PASSWORD=fixture", "DATABASE_URL=fixture", "UNKNOWN_SECRET=fixture"]:
            clean, rejected = public.public_config("APP_IMAGE=vscrm:release\n" + line)
            self.assertTrue(rejected)
            self.assertEqual(clean, "APP_IMAGE=vscrm:release\n")
        clean, rejected = public.public_config(" export CRM_HOSTNAME = vscrm.orgogo.com\nAPP_IMAGE=vscrm:release\n")
        self.assertFalse(rejected)
        self.assertIn("CRM_HOSTNAME=vscrm.orgogo.com", clean)

    def test_validation(self):
        expected = {"POSTGRES_PASSWORD": "a" * 64, "SMTP_PASSWORD": "fixture"}
        self.assertEqual(module.validate(expected), expected)
        for value in [None, [], {}, {"POSTGRES_PASSWORD": "short"},
                      {"POSTGRES_PASSWORD": "a" * 64, "DIRECT_URL": "injected"},
                      {"POSTGRES_PASSWORD": "a" * 64, "SMTP_PASSWORD": 10}]:
            with self.assertRaises(ValueError):
                module.validate(value)

    def test_pinned_resource_required_before_network(self):
        for resource in ["projects/demo/secrets/db/versions/latest", "https://attacker", "projects/demo/secrets/db/versions/1/extra"]:
            with self.assertRaises(ValueError):
                module.fetch(resource)

    def test_replacement_permissions_and_no_temporary_copy(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(module.os, "fchown") as owner:
            path = Path(directory) / "secret"
            module.write_secret(path, b"first")
            module.write_secret(path, b"second")
            self.assertEqual(path.read_bytes(), b"second")
            self.assertEqual(path.stat().st_mode & 0o777, 0o400)
            self.assertEqual(len(list(Path(directory).iterdir())), 1)
            owner.assert_called_with(unittest.mock.ANY, 1000, 1000)


if __name__ == "__main__":
    unittest.main()
