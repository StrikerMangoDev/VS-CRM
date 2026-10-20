#!/usr/bin/env python3
import json
import importlib.util
import stat
import subprocess
import urllib.error
from pathlib import Path

root = Path('/opt/vscrm')
runtime = json.loads(Path('/run/vscrm/runtime.json').read_text())
assert stat.S_IMODE(Path('/run/vscrm').stat().st_mode) == 0o700
for name in ['runtime.json', 'database-password']:
    info = Path('/run/vscrm', name).stat()
    assert info.st_uid == 1000 and stat.S_IMODE(info.st_mode) == 0o400
public = (root / '.env').read_text()
for value in runtime.values():
    if value:
        assert value not in public, 'Secret present in persistent configuration'
containers = subprocess.check_output(['docker', 'ps', '-aq', '--filter', 'label=com.docker.compose.project=vscrm'], text=True).split()
details = json.loads(subprocess.check_output(['docker', 'inspect', *containers], text=True))
assert len(details) == 3
for container in details:
    config = json.dumps(container['Config'])
    for value in runtime.values():
        if value:
            assert value not in config, 'Secret present in container configuration'
    for mount in container['Mounts']:
        if mount['Destination'].startswith('/run/secrets/'):
            assert mount['RW'] is False
    if container['Name'] == '/vscrm-app-1':
        assert container['State']['Health']['Status'] == 'healthy'
    if container['Name'] == '/vscrm-db-1':
        assert container['State']['Health']['Status'] == 'healthy'
requires = subprocess.check_output(['systemctl', 'show', 'docker.service', '-p', 'Requires', '--value'], text=True)
assert 'vscrm-secrets.service' in requires
assert subprocess.check_output(['systemctl', 'is-active', 'vscrm-secrets.service'], text=True).strip() == 'active'
spec = importlib.util.spec_from_file_location('fetch_secrets', root / 'fetch-secrets.py')
loader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(loader)
try:
    loader.fetch('projects/722607882915/secrets/vscrm-administrator/versions/1')
except urllib.error.HTTPError as error:
    assert error.code == 403
else:
    raise AssertionError('VM must not access administrator handoff secret')
print('Secret permissions, read-only mounts, container health and boot dependency verified; no secret in .env or Docker Config')
print('VM identity denied access to administrator handoff secret')
