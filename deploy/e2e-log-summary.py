import json
import re
import subprocess

result = subprocess.run(['docker', 'logs', '--since', '2026-10-20T12:15:00Z', '--tail', '500', 'vscrm-app-1'], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, check=True)
errors = [line for line in result.stdout.splitlines() if re.search(r'(^|\s)(Error:|TypeError:|ReferenceError:|PrismaClient[^ ]*Error)', line)]
messages = []
for line in errors:
    safe = re.sub(r'postgres(?:ql)?://\S+', '[redacted-database-url]', line)
    safe = re.sub(r'[A-Za-z0-9_+/=-]{24,}', '[redacted-long-value]', safe)
    safe = re.sub(r'(?i)(password|token|secret)\s*[:=]\s*\S+', r'\1=[redacted]', safe)
    messages.append(safe[:240])
print(json.dumps({'sinceUtc': '2026-10-20T12:15:00Z', 'applicationErrorLines': len(errors), 'redactedMessages': messages}))
