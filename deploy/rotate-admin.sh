#!/usr/bin/env bash
set -euo pipefail
umask 077
[[ $(id -u) -eq 0 ]]
upload_dir=${1:?Private staging directory required}
trap 'rm -f -- "$upload_dir/administrator-new.json"' EXIT
install -m 0644 "$upload_dir/rotate-admin.cjs" /opt/vscrm/
install -m 0700 "$upload_dir/public-env.py" /opt/vscrm/
python3 /opt/vscrm/public-env.py check /opt/vscrm/.env
cd /opt/vscrm
docker compose run --rm -T app node deploy/rotate-admin.cjs < "$upload_dir/administrator-new.json"
./backup.sh
