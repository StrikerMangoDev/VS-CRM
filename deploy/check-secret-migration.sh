#!/usr/bin/env bash
set -euo pipefail
upload_dir=${1:?Private staging directory required}
check_dir=$(mktemp -d /tmp/vscrm-secret-check.XXXXXXXX)
trap 'rm -rf -- "$check_dir"' EXIT
chmod 0755 "$check_dir"
mkdir "$check_dir/deploy" "$check_dir/tests"
install -m 0644 "$upload_dir/fetch-secrets.py" "$upload_dir/public-env.py" "$upload_dir/runtime-entrypoint.cjs" "$upload_dir/rotate-admin.cjs" "$check_dir/deploy/"
install -m 0644 "$upload_dir/deployment-secrets.test.py" "$upload_dir/deployment-secrets.test.cjs" "$check_dir/tests/"
python3 "$check_dir/tests/deployment-secrets.test.py"
docker run --rm --memory=128m --network=none --entrypoint=node -v "$check_dir:/app/secret-check:ro" vscrm:20261019-2gb-r1 --test /app/secret-check/tests/deployment-secrets.test.cjs
python3 -m py_compile "$upload_dir/fetch-secrets.py"
docker compose --env-file /opt/vscrm/.env -f "$upload_dir/compose.yaml" config --quiet
echo 'Secret migration focused checks passed'
