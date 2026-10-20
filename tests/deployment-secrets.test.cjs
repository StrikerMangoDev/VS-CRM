const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const source = fs.readFileSync(require.resolve('../deploy/runtime-entrypoint.cjs'), 'utf8')
function run(value, argv = ['node', 'entrypoint', 'node', 'migration.js']) {
  const result = { spawned: false, errors: [], env: { DIRECT_URL: 'untrusted', SMTP_PASSWORD: 'stale' } }
  const process = { argv, env: result.env, on() {} }
  vm.runInNewContext(source, { process, console: { error: message => result.errors.push(message) }, require(name) {
    if (name === 'node:fs') return { readFileSync: () => value }
    if (name === 'node:child_process') return { spawn(command, args, options) {
      result.spawned = true; result.command = command; result.args = [...args]; result.stdio = options.stdio
      return { on() {}, kill() {} }
    } }
    throw new Error('Unexpected import')
  } })
  return { ...result, exitCode: process.exitCode }
}
test('runtime wrapper covers CLI overrides, clears stale secrets and DIRECT_URL', () => {
  const result = run(JSON.stringify({ POSTGRES_PASSWORD: 'a'.repeat(64), GOOGLE_REFRESH_TOKEN: 'fixture-token' }))
  assert.equal(result.spawned, true)
  assert.equal(result.command, 'node')
  assert.deepEqual(result.args, ['migration.js'])
  assert.equal(result.stdio, 'inherit')
  assert.equal(result.env.DIRECT_URL, '')
  assert.equal(result.env.SMTP_PASSWORD, '')
  assert.equal(result.env.GOOGLE_REFRESH_TOKEN, 'fixture-token')
  assert.equal(result.env.DATABASE_URL, `postgresql://vscrm:${'a'.repeat(64)}@db:5432/vscrm`)
})
test('missing, malformed, injected and wrong-type secrets fail closed without logging values', () => {
  for (const value of ['', '{', 'null', '{}', JSON.stringify({ POSTGRES_PASSWORD: 'invalid/secret' }),
    JSON.stringify({ POSTGRES_PASSWORD: 'a'.repeat(64), DIRECT_URL: 'postgresql://attacker' }),
    JSON.stringify({ POSTGRES_PASSWORD: 'a'.repeat(64), SMTP_PASSWORD: {} })]) {
    const result = run(value)
    assert.equal(result.spawned, false)
    assert.equal(result.exitCode, 1)
    assert.deepEqual(result.errors, ['Runtime secret configuration is missing or invalid'])
  }
})
test('no command fails closed', () => {
  assert.equal(run(JSON.stringify({ POSTGRES_PASSWORD: 'a'.repeat(64) }), ['node', 'entrypoint']).spawned, false)
})
test('malformed administrator rotation input cannot leak password fragments', () => {
  const { spawnSync } = require('node:child_process')
  for (const input of ['{"password":fixture-password-no-quotes}', '{"email":"x@example.invalid","password":"short"}']) {
    const result = spawnSync(process.execPath, [require.resolve('../deploy/rotate-admin.cjs')], { input, encoding: 'utf8' })
    assert.equal(result.status, 1)
    assert.equal(result.stdout, '')
    assert.equal(result.stderr.trim(), 'Administrator rotation failed')
  }
})
