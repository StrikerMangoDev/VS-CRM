#!/usr/bin/env python3
"""Persist only explicitly nonsensitive Compose settings."""
import re
import sys
from pathlib import Path

PUBLIC_KEYS = {"APP_IMAGE", "CRM_HOSTNAME", "SMTP_HOST", "SMTP_PORT", "SMTP_FROM",
               "SMTP_USER", "SMTP_SECURE", "SMTP_REQUIRE_TLS", "GOOGLE_CLIENT_ID",
               "GOOGLE_DRIVE_FOLDER_ID"}


def public_config(content):
    kept, rejected = [], False
    for line in content.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        match = re.fullmatch(r"\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)", line)
        if match and match[1] in PUBLIC_KEYS:
            kept.append(match[1] + "=" + match[2].strip())
        else:
            rejected = True
    return "\n".join(kept) + "\n", rejected


if __name__ == "__main__":
    mode, filename = sys.argv[1:]
    if mode not in {"check", "sanitize"}:
        sys.exit("Unknown public configuration operation")
    path = Path(filename)
    clean, rejected = public_config(path.read_text())
    if mode == "check" and rejected:
        sys.exit("Refusing secret or unknown keys in persistent configuration; use Secret Manager")
    if mode == "sanitize":
        path.write_text(clean)
        path.chmod(0o600)
