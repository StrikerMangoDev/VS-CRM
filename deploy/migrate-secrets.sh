#!/usr/bin/env bash
set -euo pipefail
umask 077
[[ $(id -u) -eq 0 ]]
upload_dir=${1:?Private staging directory required}
cd /opt/vscrm
./backup.sh
install -m 0700 "$upload_dir/fetch-secrets.py" /opt/vscrm/
printf 'projects/722607882915/secrets/vscrm-runtime/versions/1\n' > secret-resource
chmod 0600 secret-resource
install -m 0644 "$upload_dir/vscrm-secrets.service" /etc/systemd/system/
systemctl daemon-reload
systemctl start vscrm-secrets.service
python3 - <<'PY'
import json
from pathlib import Path
current = dict(line.split('=', 1) for line in Path('.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
managed = json.loads(Path('/run/vscrm/runtime.json').read_text())
assert current['POSTGRES_PASSWORD'] == managed['POSTGRES_PASSWORD'], 'Database credential mismatch; refusing migration'
print('Managed credential matches the existing database configuration')
PY
docker compose stop
install -m 0644 "$upload_dir/compose.yaml" "$upload_dir/runtime-entrypoint.cjs" "$upload_dir/rotate-admin.cjs" /opt/vscrm/
install -m 0700 "$upload_dir/public-env.py" /opt/vscrm/
python3 /opt/vscrm/public-env.py sanitize .env
install -m 0755 -d /etc/systemd/system/docker.service.d
install -m 0644 "$upload_dir/docker-secrets.conf" /etc/systemd/system/docker.service.d/vscrm-secrets.conf
systemctl daemon-reload
docker compose config --quiet
docker compose up -d --force-recreate --wait --wait-timeout 180
docker compose run --rm app node node_modules/prisma/build/index.js migrate status
./backup.sh
docker compose ps
echo 'Secret-managed containers started; verify config, login and reboot recovery'
