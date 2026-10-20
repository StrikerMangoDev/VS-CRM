#!/usr/bin/env bash
set -euo pipefail
upload_dir=${1:?Private staging directory required}
cd /opt/vscrm
python3 "$upload_dir/verify-managed-secrets.py"
docker compose run --rm -T -v "$upload_dir/smoke-production.cjs:/app/deploy/smoke-production.cjs:ro" app node deploy/smoke-production.cjs
docker compose exec -T db psql -U vscrm -d vscrm -At <<'SQL'
SELECT 'integration_credentials=' || count(*) FROM "IntegrationCredential";
SELECT 'administrators=' || count(*) FROM "User" WHERE role = 'ADMIN';
SELECT 'admin_reset_credentials=' || count(*) FROM "User" WHERE role = 'ADMIN' AND ("resetToken" IS NOT NULL OR "resetTokenExpiry" IS NOT NULL);
SQL
systemctl start vscrm-backup.service
systemctl show vscrm-backup.service -p Result --value
systemctl list-timers vscrm-backup.timer --no-pager
