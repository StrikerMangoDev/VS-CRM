const fs = require('node:fs')
const { spawn } = require('node:child_process')

try {
  const secrets = JSON.parse(fs.readFileSync('/run/secrets/runtime.json', 'utf8'))
  if (!/^[a-f0-9]{64}$/.test(secrets.POSTGRES_PASSWORD)) throw new Error()
  const keys = ['SMTP_PASSWORD', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'SMARTFLO_API_TOKEN']
  if (Object.keys(secrets).some(key => key !== 'POSTGRES_PASSWORD' && !keys.includes(key))) throw new Error()
  for (const key of keys) {
    if (secrets[key] !== undefined && typeof secrets[key] !== 'string') throw new Error()
    process.env[key] = secrets[key] || ''
  }
  process.env.DATABASE_URL = `postgresql://vscrm:${secrets.POSTGRES_PASSWORD}@db:5432/vscrm`
  process.env.DIRECT_URL = ''
  const [command, ...args] = process.argv.slice(2)
  if (!command) throw new Error()
  const child = spawn(command, args, { stdio: 'inherit' })
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal))
  child.on('error', () => { console.error('Runtime command failed'); process.exitCode = 1 })
  child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0) })
} catch {
  console.error('Runtime secret configuration is missing or invalid')
  process.exitCode = 1
}
