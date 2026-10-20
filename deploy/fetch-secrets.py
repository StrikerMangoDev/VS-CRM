#!/usr/bin/env python3
"""Fetch the pinned runtime secret using the attached VM identity; never log payloads."""
import base64
import json
import os
import re
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

SECRET_KEYS = {"POSTGRES_PASSWORD", "SMTP_PASSWORD", "GOOGLE_CLIENT_SECRET",
               "GOOGLE_REFRESH_TOKEN", "SMARTFLO_API_TOKEN"}


def validate(value):
    if not isinstance(value, dict) or set(value) - SECRET_KEYS:
        raise ValueError("Invalid secret configuration")
    if not all(isinstance(item, str) for item in value.values()):
        raise ValueError("Invalid secret configuration")
    if not re.fullmatch(r"[a-f0-9]{64}", value.get("POSTGRES_PASSWORD", "")):
        raise ValueError("Invalid database password")
    return value


def write_secret(path, content):
    descriptor, temporary = tempfile.mkstemp(dir=path.parent)
    try:
        with os.fdopen(descriptor, "wb") as stream:
            os.fchmod(stream.fileno(), 0o400)
            os.fchown(stream.fileno(), 1000, 1000)
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def fetch(resource):
    if not re.fullmatch(r"projects/[a-z0-9-]+/secrets/[a-zA-Z0-9_-]+/versions/[1-9][0-9]*", resource):
        raise ValueError("A pinned secret version is required")
    request = urllib.request.Request(
        "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
        headers={"Metadata-Flavor": "Google"})
    with urllib.request.urlopen(request, timeout=10) as response:
        token = json.load(response)["access_token"]
    request = urllib.request.Request(
        "https://secretmanager.googleapis.com/v1/" + resource + ":access",
        headers={"Authorization": "Bearer " + token})
    with urllib.request.urlopen(request, timeout=15) as response:
        result = json.load(response)
    if result.get("name") != resource:
        raise ValueError("Unexpected secret version")
    return validate(json.loads(base64.b64decode(result["payload"]["data"], validate=True)))


def main():
    resource = Path("/opt/vscrm/secret-resource").read_text().strip()
    for attempt in range(6):
        try:
            secrets = fetch(resource)
            destination = Path("/run/vscrm")
            destination.mkdir(mode=0o700, exist_ok=True)
            os.chmod(destination, 0o700)
            write_secret(destination / "runtime.json", json.dumps(secrets).encode())
            write_secret(destination / "database-password", secrets["POSTGRES_PASSWORD"].encode())
            print("Pinned runtime secret loaded")
            return
        except Exception:
            if attempt == 5:
                raise RuntimeError("Runtime secret retrieval failed; containers must remain stopped") from None
            time.sleep(5)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        print("Runtime secret retrieval failed; containers must remain stopped", file=sys.stderr)
        sys.exit(1)
