#!/usr/bin/env bash
set -euo pipefail
umask 077
[[ $(id -u) -eq 0 ]]
upload_dir=${1:?Upload directory required}
expected_sha=${2:?Archive SHA-256 required}
[[ "$expected_sha" =~ ^[a-f0-9]{64}$ ]]
printf '%s  %s/vscrm-release.tar.gz\n' "$expected_sha" "$upload_dir" | sha256sum --check -
install -m 0700 -d /opt/vscrm /opt/vscrm/backups
python3 "$upload_dir/public-env.py" check "$upload_dir/production.env"
install -m 0600 "$upload_dir/production.env" /opt/vscrm/.env
install -m 0644 "$upload_dir/compose.yaml" "$upload_dir/Caddyfile" /opt/vscrm/
install -m 0644 "$upload_dir/runtime-entrypoint.cjs" "$upload_dir/rotate-admin.cjs" /opt/vscrm/
install -m 0700 "$upload_dir/fetch-secrets.py" /opt/vscrm/
install -m 0700 "$upload_dir/public-env.py" /opt/vscrm/
install -m 0600 "$upload_dir/secret-resource" /opt/vscrm/
install -m 0644 "$upload_dir/vscrm-secrets.service" /etc/systemd/system/
install -m 0755 -d /etc/systemd/system/docker.service.d
install -m 0644 "$upload_dir/docker-secrets.conf" /etc/systemd/system/docker.service.d/vscrm-secrets.conf
systemctl daemon-reload
systemctl restart vscrm-secrets.service
systemctl start docker.service
install -m 0700 "$upload_dir/backup.sh" /opt/vscrm/backup.sh
printf 'BACKUP_BUCKET=vscrm-backups-722607882915\n' > /opt/vscrm/backup.env
chmod 0600 /opt/vscrm/backup.env
cd /opt/vscrm
grep -qx 'APP_IMAGE=vscrm:20261019-2gb-r1' .env
docker load --input "$upload_dir/vscrm-release.tar.gz"
docker compose config --quiet
docker compose up -d db
docker compose run --rm app node node_modules/prisma/build/index.js migrate deploy
if [[ ! -f .admin-bootstrapped ]]; then
  docker compose run --rm -T app node deploy/bootstrap-admin.cjs < "$upload_dir/administrator.json"
  touch .admin-bootstrapped
fi
rm -f -- "$upload_dir/administrator.json" "$upload_dir/production.env"
docker compose up -d
./backup.sh
install -m 0644 "$upload_dir/vscrm-backup.service" "$upload_dir/vscrm-backup.timer" /etc/systemd/system/
systemctl daemon-reload
docker compose ps
echo 'Release started and first backup uploaded. Verify restoration before enabling the backup timer.'
