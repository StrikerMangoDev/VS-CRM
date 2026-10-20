const fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const { AsyncLocalStorage } = require('node:async_hooks')
const request = new AsyncLocalStorage(), modules = new Map(), sentMail = []
function load(file) {
  const absolute = path.resolve(__dirname, '..', file)
  if (modules.has(absolute)) return modules.get(absolute).exports
  const module = { exports: {} }; modules.set(absolute, module)
  const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
    fileName: absolute,
  }).outputText
  function localRequire(id) {
    if (id === 'next/headers') return { cookies: async () => request.getStore(), headers: async () => new Headers() }
    if (id === 'next/cache') return { revalidatePath() {} }
    if (id === 'nodemailer') return { createTransport: () => ({ sendMail: async data => { sentMail.push(data); return { messageId: 'local-test' } } }) }
    if (id.startsWith('@/')) return load('src/' + id.slice(2) + '.ts')
    if (id.startsWith('.')) return load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(absolute), id)) + '.ts')
    return require(id)
  }
  new Function('require', 'exports', 'module', code)(localRequire, module.exports, module)
  return module.exports
}
function withCookies(values, work) {
  const jar = new Map(Object.entries(values || {}))
  return request.run({
    get: name => jar.has(name) ? { value: jar.get(name) } : undefined,
    set: (name, value) => jar.set(name, value),
    delete: name => jar.delete(typeof name === 'string' ? name : name.name),
  }, () => work(jar))
}
module.exports = { load, withCookies, sentMail }

