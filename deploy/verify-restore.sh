#!/usr/bin/env bash
set -euo pipefail
[[ $(id -u) -eq 0 ]]
dump_file=${1:?Downloaded backup file required}
[[ -s "$dump_file" ]]
cd /opt/vscrm
docker compose exec -T db createdb -U vscrm vscrm_restore_check
trap 'docker compose exec -T db dropdb -U vscrm vscrm_restore_check' EXIT
docker compose exec -T db pg_restore -U vscrm --no-owner --no-privileges -d vscrm_restore_check < "$dump_file"
query='SELECT (SELECT count(*) FROM "User"), (SELECT count(*) FROM "Lead"), (SELECT count(*) FROM "Assignment"), (SELECT count(*) FROM "CallRecord"), (SELECT count(*) FROM "TaskRecord");'
original=$(docker compose exec -T db psql -U vscrm -d vscrm -At -c "$query")
restored=$(docker compose exec -T db psql -U vscrm -d vscrm_restore_check -At -c "$query")
[[ "$original" == "$restored" ]] || { echo 'Restore row-count comparison failed'; exit 1; }
echo "Backup restored successfully; core row counts match: $restored"
systemctl enable --now vscrm-backup.timer
systemctl list-timers vscrm-backup.timer --no-pager
