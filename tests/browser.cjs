const assert = require('node:assert/strict')
const fs = require('node:fs'), net = require('node:net')
const { spawn } = require('node:child_process')
const { randomBytes, createHash } = require('node:crypto')
const { chromium } = require('@playwright/test')
const { PrismaClient } = require('@prisma/client'), { PrismaPg } = require('@prisma/adapter-pg'), { Pool } = require('pg')
const bcrypt = require('bcryptjs')
async function main() {
  const url = new URL(process.env.TEST_DATABASE_URL || '')
  if (!['127.0.0.1','localhost'].includes(url.hostname) || url.pathname !== '/vscrm_test') throw new Error('Use only the isolated local vscrm_test database')
  const pool = new Pool({ connectionString: url.toString() }), db = new PrismaClient({ adapter: new PrismaPg(pool) })
  const mail = []
  const smtp = net.createServer(socket => {
    socket.write('220 localhost test SMTP\r\n')
    let buffer = '', data = false, message = ''
    socket.on('data', chunk => {
      buffer += chunk.toString()
      let index
      while ((index = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0,index); buffer = buffer.slice(index+2)
        if (data) { if(line === '.') {mail.push(message); message=''; data=false; socket.write('250 Stored\r\n')} else message += line+'\n'; continue }
        if (/^EHLO|^HELO/.test(line)) socket.write('250-localhost\r\n250 PIPELINING\r\n')
        else if (line === 'DATA') {data=true;socket.write('354 End with dot\r\n')}
        else if (line === 'QUIT') {socket.end('221 Bye\r\n')}
        else socket.write('250 OK\r\n')
      }
    })
  })
  let server, browser
  const errors = [], results = []
  const originalPush = results.push.bind(results); results.push = value => { console.log(value); return originalPush(value) }
  try {
    await new Promise(resolve => smtp.listen(4321, '127.0.0.1', resolve))
    const tag = randomBytes(4).toString('hex'), password = 'TestPassword123!'
    const hash = await bcrypt.hash(password,10), actors = {}
    for(const [key,role,department,mainDepartment] of [
      ['admin','ADMIN','ALL','Sales Department'], ['sales','EXEC','SALES','Sales Department'],
      ['tl','TL','ALL','Sales Department'], ['tech','EXEC','TECHNICAL','Sales Department'],
      ['manager','MANAGER','ALL','Social Media'], ['editor','EXEC','Editing Team','Social Media'],
      ['graphics','EXEC','Graphics Team','Social Media'], ['posting','EXEC','Posting Team','Social Media'],
      ['other','EXEC','Other Team','Social Media'],
    ]) {
      const user = await db.user.create({data:{email:key+'-e2e-'+tag+'@example.invalid',name:key+' E2E '+tag,role,department,mainDepartment,password:hash}})
      const token = randomBytes(32).toString('hex')
      await db.session.create({data:{tokenHash:createHash('sha256').update(token).digest('hex'),userId:user.id,expiresAt:new Date(Date.now()+86400000)}})
      actors[key] = { ...user, token }
    }
    const category=await db.webinarCategory.create({data:{code:'E'+tag,name:'E2E '+tag}})
    const webinar=await db.webinarMaster.create({data:{id:'E2E-'+tag,categoryId:category.id,name:'E2E webinar '+tag,date:new Date(),endDate:new Date(),whatsappGroupUrl:'https://example.invalid/group'}})
    const currentLead=await db.lead.create({data:{uniqueId:'E2E-LEAD-'+tag,name:'E2E original '+tag,mobileNumber:'9876500000',email:'lead-'+tag+'@example.invalid',webinarId:webinar.id,webinarName:webinar.name,paymentStatus:'PART_PAYMENT',totalPayment:1000,paymentDate:new Date(),assignments:{create:{userId:actors.sales.id,stage:'FRESH_LOG'}}}})
    const oldDate=new Date('2020-01-01T00:00:00Z')
    await db.lead.create({data:{uniqueId:'E2E-OLD-'+tag,name:'Old payment',mobileNumber:'9876500001',webinarId:webinar.id,paymentStatus:'PART_PAYMENT',totalPayment:1000000,paymentDate:oldDate,assignments:{create:{userId:actors.sales.id,stage:'FRESH_LOG'}}}})
    await db.callRecord.createMany({data:[{leadId:currentLead.id,userId:actors.sales.id,smartfloRefId:'current-'+tag,duration:3600},{leadId:currentLead.id,userId:actors.sales.id,smartfloRefId:'old-'+tag,duration:36000,createdAt:oldDate}]})
    await db.webinarAttendanceUpload.create({data:{webinarId:webinar.id,webinarDay:'1',uploadedFile:'local-fixture.csv',uploadedBy:actors.admin.email,records:{create:{webinarId:webinar.id,webinarDay:'1',email:actors.sales.email}}}})
    await db.webinarAttendanceUpload.create({data:{webinarId:webinar.id,webinarDay:'2',uploadedFile:'old-fixture.csv',uploadedBy:actors.admin.email,createdAt:oldDate,records:{create:{webinarId:webinar.id,webinarDay:'2',email:actors.sales.email}}}})
    const department=await db.orgDepartment.create({data:{name:'E2E Department '+tag,userMatchRule:'Sales Department'}})
    const team=await db.orgTeam.create({data:{name:'Sales Team',userMatchRule:'SALES',departmentId:department.id}})
    const portal=await db.orgModule.create({data:{name:'E2E Portal',departmentId:department.id,allowedTeams:{connect:{id:team.id}}}})
    const pagination=require('./pagination-browser.cjs')
    const paginationFixture=await pagination.seed(db,actors,webinar,portal,tag)
    server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','4319'],{
      stdio:['ignore','pipe','pipe'],env:{...process.env,DATABASE_URL:url.toString(),DIRECT_URL:'',APP_URL:'http://127.0.0.1:4319',NEXT_TELEMETRY_DISABLED:'1',SMTP_HOST:'127.0.0.1',SMTP_PORT:'4321',SMTP_FROM:'test@example.invalid',SMTP_REQUIRE_TLS:'false',SMTP_USER:'',SMTP_PASSWORD:'',GOOGLE_CLIENT_ID:'',GOOGLE_CLIENT_SECRET:'',GOOGLE_REFRESH_TOKEN:'',GOOGLE_DRIVE_FOLDER_ID:'',SMARTFLO_API_TOKEN:''},
    })
    let serverLog=''
    server.stdout.on('data',c=>serverLog+=c.toString());server.stderr.on('data',c=>serverLog+=c.toString())
    await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Server did not start: '+serverLog)),20000);server.stdout.on('data',c=>{if(c.toString().includes('Ready')){clearTimeout(timeout);resolve()}});server.once('exit',code=>{clearTimeout(timeout);reject(new Error('Server exited '+code))})})
    browser=await chromium.launch({headless:true,channel:'chrome'})
    const anonymous=await browser.newContext(),page=await anonymous.newPage()
    page.on('pageerror',error=>errors.push(error.message))
    for(const route of ['/login','/forgot-password','/reset-password']){const response=await page.goto('http://127.0.0.1:4319'+route);assert.equal(response.status(),200);assert.ok(page.url().endsWith(route));results.push(route+' public: PASS')}
    const forged=await browser.newContext();await forged.addCookies([{name:'vscrm_session',value:JSON.stringify({role:'ADMIN',id:actors.admin.id}),url:'http://127.0.0.1:4319'}])
    assert.equal((await forged.request.post('http://127.0.0.1:4319/api/settings/incentives',{data:{fixedIncentiveAmount:99999}})).status(),401)
    await forged.close();results.push('forged cookie/API write rejected: PASS')
    await page.goto('http://127.0.0.1:4319/login')
    await page.locator('input[name=email]').fill(actors.admin.email);await page.locator('input[name=password]').fill(password)
    await page.locator('button[type=submit]').click();await page.waitForURL('**/performance')
    assert.ok((await anonymous.cookies()).some(c=>c.name==='vscrm_session'&&/^[a-f0-9]{64}$/.test(c.value)))
    results.push('real browser password login and dashboard: PASS')
    if (process.env.TEST_ARTIFACT_DIR) await page.screenshot({ path: require('node:path').join(process.env.TEST_ARTIFACT_DIR,'dashboard.png'), fullPage: true })
    await page.goto('http://127.0.0.1:4319/')
    await page.getByRole('button',{name:'+ New Lead',exact:true}).click()
    await page.locator('input[name=name]').fill('Created via UI '+tag)
    await page.locator('select[name=webinarId]').selectOption(webinar.id)
    await page.locator('input[name=email]').fill('new-'+tag+'@example.invalid')
    await page.locator('input[name=state]').fill('Maharashtra')
    await page.locator('input[name=mobileNumber]').fill('9876512345')
    await page.getByRole('button',{name:'Create Lead',exact:true}).click()
    await page.getByText('Lead created successfully',{exact:true}).waitFor()
    assert.equal(await db.lead.count({where:{name:'Created via UI '+tag}}),1)
    results.push('browser -> server action -> PostgreSQL lead creation: PASS')
    const routesByRole=process.env.TEST_PAGINATION_ONLY?{}:{
      admin:['/team','/reports','/incentives','/webinars','/part-payment','/full-payment','/recovery','/technical','/settings','/settings/dropdowns','/settings/issues','/settings/social-channels','/settings/social-media-targets','/settings/whatsapp-templates','/settings/webinar-attendance-upload','/social-media/vs','/social-media/task-assigned','/social-media/ad-creative-sheet'],
      sales:['/sales','/performance','/extra-dialer','/settings/history','/settings/call-history','/portal/'+department.id+'/'+portal.id],
      tl:['/team','/reports','/incentives'],tech:['/technical','/technical/issues'],
      manager:['/social-media/vs','/social-media/task-assigned','/reports','/team'],
      editor:['/social-media/working-sheet','/social-media/ad-creative-working-sheet'],
      graphics:['/social-media/graphics-working-sheet','/social-media/thumbnail-sheet'],
      posting:['/social-media/posting-sheet','/social-media/posting-daily-task'],other:['/social-media/task-assigned'],
    }
    if(routesByRole.admin)routesByRole.admin.push('/settings/theme','/settings/sales-call-report','/admin/file-manager','/extra-dialer-leads','/analytics')
    for(const [key,routes]of Object.entries(routesByRole)){
      const context=await browser.newContext()
      await context.addCookies([{name:'vscrm_session',value:actors[key].token,url:'http://127.0.0.1:4319'}])
      const p=await context.newPage();p.on('pageerror',error=>{const detail=key+' '+new URL(p.url()).pathname+': '+error.message;console.error(detail);errors.push(detail)})
      for(const route of routes){
        const response=await p.goto('http://127.0.0.1:4319'+route,{waitUntil:'networkidle'})
        assert.equal(response.status(),200,key+' '+route)
        assert.ok(new URL(p.url()).pathname===route,key+' unexpectedly redirected from '+route+' to '+p.url())
        const html=await p.content()
        assert.ok(!html.includes(hash),'Password hash leaked into browser')
        results.push(key+' '+route+': PASS')
        if(key==='admin'&&route==='/incentives'){
          const row=p.getByRole('row').filter({hasText:actors.sales.name})
          await row.waitFor()
          assert.match(await row.innerText(),/1 \/ 6 days/)
          assert.match(await row.innerText(),/60 \/ 5200 mins/)
          assert.match(await row.innerText(),/₹1,000/)
          const first=await row.innerText();await p.reload({waitUntil:'networkidle'})
          assert.equal(await p.getByRole('row').filter({hasText:actors.sales.name}).innerText(),first)
          results.push('incentives use EXEC, real calls, monthly inputs and stable refreshes: PASS')
        }
      }
      await context.close()
    }
    await pagination.check({browser,db,actors,webinar,portal,department,fixture:paginationFixture,results,errors})
    const salesContext=await browser.newContext()
    await salesContext.addCookies([{name:'vscrm_session',value:actors.sales.token,url:'http://127.0.0.1:4319'}])
    assert.equal((await salesContext.request.post('http://127.0.0.1:4319/api/settings/incentives',{data:{fixedIncentiveAmount:999}})).status(),401)
    assert.equal((await salesContext.request.post('http://127.0.0.1:4319/api/issues/dropdowns',{data:{type:'ISSUE_TYPE',value:'Unauthorized'}})).status(),401)
    await salesContext.close();results.push('valid executive denied admin APIs: PASS')
    await anonymous.clearCookies();await page.goto('http://127.0.0.1:4319/forgot-password')
    await page.locator('input[name=email]').fill(actors.admin.email);await page.getByRole('button',{name:'Send OTP',exact:true}).click()
    await page.getByText('OTP has been sent to your email address.',{exact:true}).waitFor()
    assert.equal(mail.length,1);assert.equal(await page.getByText('[Dev Only] Click here to view OTP Email').count(),0)
    const otp=mail[0].match(/\b\d{6}\b/)[0]
    await page.getByRole('link',{name:'Proceed to Reset Password'}).click()
    await page.locator('input[name=otp]').fill(otp);await page.locator('input[name=newPassword]').fill('ResetPassword123!')
    await page.locator('input[name=confirmPassword]').fill('ResetPassword123!')
    await page.locator('button[type=submit]').click()
    await page.getByText(/Password reset successful/i).waitFor()
    assert.equal(await db.session.count({where:{userId:actors.admin.id}}),0)
    results.push('browser -> local SMTP -> OTP reset -> session revocation: PASS')
    assert.deepEqual(errors,[])
    if (process.env.TEST_ARTIFACT_DIR) fs.writeFileSync(require('node:path').join(process.env.TEST_ARTIFACT_DIR,'browser-results.json'), JSON.stringify({ results, pageErrors: errors },null,2))
    console.log(results.join('\n'));console.log('Browser checks passed: '+results.length+'; page errors: '+errors.length)
  } finally {
    await browser?.close();server?.kill();await new Promise(resolve=>smtp.close(resolve))
    await db.$disconnect();await pool.end()
  }
}
main().catch(error=>{console.error(error);process.exitCode=1})

