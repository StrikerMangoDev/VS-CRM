#!/usr/bin/env bash
set -euo pipefail
[[ $(id -u) -eq 0 ]]
upload_dir=${1:?Private staging directory required}
cd /opt/vscrm
python3 - <<'PY'
from pathlib import Path
path = Path('.env')
lines = path.read_text().splitlines()
assert sum(line.startswith('CRM_HOSTNAME=') for line in lines) == 1
path.write_text('\n'.join('CRM_HOSTNAME=vscrm.orgogo.com' if line.startswith('CRM_HOSTNAME=') else line for line in lines) + '\n')
path.chmod(0o600)
PY
python3 public-env.py check .env
install -m 0644 "$upload_dir/Caddyfile" /opt/vscrm/
docker compose config --quiet
docker compose run --rm --no-deps web caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker compose up -d --force-recreate --wait --wait-timeout 180 app web
docker compose ps
