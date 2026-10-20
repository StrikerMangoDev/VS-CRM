#!/usr/bin/env bash
set -euo pipefail
umask 077
cd /opt/vscrm
source /opt/vscrm/backup.env
[[ "$BACKUP_BUCKET" =~ ^[a-z0-9][a-z0-9._-]+$ ]]
backup_file=$(mktemp /opt/vscrm/backups/vscrm-XXXXXXXX.dump)
trap 'rm -f -- "$backup_file"' EXIT
docker compose exec -T db pg_dump -U vscrm -d vscrm -Fc > "$backup_file"
docker compose exec -T db pg_restore --list < "$backup_file" > /dev/null
token=$(curl --fail --silent --show-error --header 'Metadata-Flavor: Google' http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')
object_name="vscrm-$(date -u +%Y%m%dT%H%M%SZ).dump"
printf 'header = "Authorization: Bearer %s"\n' "$token" | curl --config - --fail --silent --show-error --request POST --header 'Content-Type: application/octet-stream' --data-binary "@$backup_file" "https://storage.googleapis.com/upload/storage/v1/b/${BACKUP_BUCKET}/o?uploadType=media&name=${object_name}&ifGenerationMatch=0" > /dev/null
echo "Database backup uploaded: ${object_name}"
