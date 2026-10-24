const {test,before,beforeEach,after}=require('node:test')
const assert=require('node:assert/strict')
const {randomUUID,randomBytes}=require('node:crypto')
const target=new URL(process.env.TEST_DATABASE_URL||'http://invalid')
if(!['127.0.0.1','localhost'].includes(target.hostname)||target.pathname!=='/vscrm_test')throw Error('Calling tests require isolated local vscrm_test')
process.env.DATABASE_URL=process.env.TEST_DATABASE_URL
delete process.env.DIRECT_URL
const {load,withCookies}=require('./source-loader.cjs')
let db,actions,actor,other,tokens={},records=new Map(),requests=[],nextRef,providerError=false,networkError=false
const originalFetch=global.fetch,originalToken=process.env.SMARTFLO_API_TOKEN
const run=(user,fn)=>withCookies({vscrm_session:tokens[user]},fn)
async function lead(){return db.lead.create({data:{uniqueId:'CALL-'+randomUUID(),name:'Calling regression',mobileNumber:'9999999999',paymentStatus:'NO_PAYMENT',assignments:{create:{userId:actor.id,stage:'FRESH_LOG'}}}})}
async function start(){const row=await lead(),result=await run('actor',()=>actions.initiateCallAction(row.id));assert.equal(result.success,true);return{lead:row,ref:result.ref_id}}
function final(ref,status='answered',seconds=37){return{ref_id:ref,status,answered_seconds:seconds,end_stamp:'2026-10-24 12:00:00',recording_url:'https://cloudphone.tatateleservices.com/recording/test'}}
before(async()=>{
 db=load('src/lib/prisma.ts').prisma;actions=load('src/app/actions/call.ts')
 const auth=load('src/lib/auth.ts')
 for(const name of ['actor','other']){
  const user=await db.user.create({data:{name:'Call '+name,email:randomUUID()+'@example.invalid',role:'EXEC',department:'SALES',mainDepartment:'Sales Department',mobileNumber:'9999999991'}})
  if(name==='actor')actor=user;else other=user
  tokens[name]=randomBytes(32).toString('hex')
  await db.session.create({data:{tokenHash:auth.tokenHash(tokens[name]),userId:user.id,expiresAt:new Date(Date.now()+3600000)}})
 }
 process.env.SMARTFLO_API_TOKEN='isolated-smartflo-test-token'
 global.fetch=async(input,options={})=>{
  const url=new URL(String(input));assert.equal(url.origin,'https://api-smartflo.tatateleservices.com','Unexpected network access')
  requests.push({url,body:options.body?JSON.parse(options.body):null,startedAt:Date.now()})
  if(networkError)throw new TypeError('Simulated network failure')
  if(providerError)return new Response(JSON.stringify({success:false,message:'Simulated provider failure'}),{status:400})
  if(url.pathname.endsWith('/click_to_call'))return Response.json({success:true,ref_id:nextRef})
  if(url.pathname.endsWith('/live_calls'))return Response.json([])
  if(url.pathname.endsWith('/call/records'))return Response.json({results:records.get(url.searchParams.get('ref_id'))||[]})
  throw Error('Unexpected Smartflo endpoint')
 }
})
beforeEach(async()=>{
 await db.callRecord.deleteMany({where:{userId:{in:[actor.id,other.id]}}})
 records=new Map();requests=[];nextRef=randomUUID();providerError=false;networkError=false
})
after(async()=>{
 global.fetch=originalFetch
 if(originalToken===undefined)delete process.env.SMARTFLO_API_TOKEN;else process.env.SMARTFLO_API_TOKEN=originalToken
 if(db)await db.$disconnect()
})
test('accepted calls are durable before polling, use async initiation, and retain provider reference',async()=>{
 const value=await start(),call=await db.callRecord.findUniqueOrThrow({where:{smartfloRefId:value.ref}})
 assert.equal(call.status,'RINGING');assert.equal(call.duration,0);assert.equal(call.userId,actor.id)
 const request=requests.find(r=>r.body)
 assert.equal(request.body.async,1);assert.equal(request.body.custom_identifier.crmcall,call.id)
 assert.equal(request.body.destination_number,'09999999999')
 assert.equal((await db.lead.findUnique({where:{id:value.lead.id}})).callStatus,'UNTOUCHED')
})

test('simultaneous provider reads are paced instead of bursting the account limit',async()=>{
 const smartflo=load('src/lib/smartflo.ts')
 await Promise.all([smartflo.smartfloLiveCalls(),smartflo.smartfloLiveCalls(),smartflo.smartfloLiveCalls()])
 assert.equal(requests.length,3)
 assert.ok(requests[1].startedAt-requests[0].startedAt>=450)
 assert.ok(requests[2].startedAt-requests[1].startedAt>=450)
})
test('empty live-call results and delayed CDR never fabricate a disconnection',async()=>{
 const value=await start()
 assert.equal((await run('actor',()=>actions.checkCallStatusAction(value.ref))).active,true)
 records.set(value.ref,[{...final('another-reference'),status:'missed'}])
 assert.equal((await run('actor',()=>actions.checkCallStatusAction(value.ref))).active,true)
 records.set(value.ref,[{...final(value.ref),end_stamp:null}])
 assert.equal((await run('actor',()=>actions.checkCallStatusAction(value.ref))).active,true)
 assert.equal((await db.callRecord.findUnique({where:{smartfloRefId:value.ref}})).status,'RINGING')
})
test('missed calls use zero provider talk time even when browser timer counted 25 seconds',async()=>{
 const value=await start();records.set(value.ref,[final(value.ref,'missed',0)])
 assert.equal((await run('actor',()=>actions.checkCallStatusAction(value.ref))).active,false)
 const result=await run('actor',()=>actions.saveCallLogAction({leadId:value.lead.id,refId:value.ref,duration:25}))
 assert.equal(result.callRecord.duration,0);assert.equal(result.callStatus,'CALL_NOT_CONNECTED')
 assert.equal((await db.lead.findUnique({where:{id:value.lead.id}})).callStatus,'CALL_NOT_CONNECTED')
})
test('answered calls retain exact provider duration and recording instead of client estimates',async()=>{
 const value=await start();records.set(value.ref,[final(value.ref,'answered',73)])
 const result=await run('actor',()=>actions.saveCallLogAction({leadId:value.lead.id,refId:value.ref,duration:5}))
 assert.equal(result.callRecord.duration,73);assert.equal(result.callRecord.status,'COMPLETED')
 assert.equal(result.callStatus,'CALL_CONNECTED');assert.ok(result.callRecord.recordingUrl.startsWith('https://'))
 assert.equal((await run('actor',()=>actions.fetchCallRecordingAction(value.ref))).url,result.callRecord.recordingUrl)
})
test('provider outages preserve the pending call and cannot end the phone UI',async()=>{
 const value=await start();networkError=true
 const status=await run('actor',()=>actions.checkCallStatusAction(value.ref))
 assert.equal(status.active,true);assert.ok(status.error)
 assert.equal((await db.callRecord.findUnique({where:{smartfloRefId:value.ref}})).status,'RINGING')
})
test('opening history reconciles a call even if its initiating browser was closed',async()=>{
 const value=await start();records.set(value.ref,[final(value.ref,'answered',19)])
 const page=await run('actor',()=>load('src/app/actions/lead-query.ts').getCallPage({mode:'HISTORY'}))
 const row=page.rows.find(r=>r.smartfloRefId===value.ref)
 assert.equal(row.duration,19);assert.equal(row.status,'COMPLETED');assert.ok(row.recordingUrl)
 const logs=await run('actor',()=>load('src/app/actions/lead.ts').getCallLogsAction(value.lead.id))
 assert.equal(logs[0].duration,19)
})
test('a different caller cannot poll or save another callers reference',async()=>{
 const value=await start()
 await assert.rejects(()=>run('other',()=>actions.checkCallStatusAction(value.ref)),/Forbidden/)
 await assert.rejects(()=>run('other',()=>actions.saveCallLogAction({leadId:value.lead.id,refId:value.ref,duration:50})),/Forbidden/)
})
test('invalid provider durations do not overwrite the stored call',async()=>{
 const value=await start();records.set(value.ref,[final(value.ref,'answered',-1)])
 assert.equal((await run('actor',()=>actions.checkCallStatusAction(value.ref))).active,true)
 assert.equal((await db.callRecord.findUnique({where:{smartfloRefId:value.ref}})).duration,0)
})
test('concurrent call clicks result in one provider request and one durable call',async()=>{
 const row=await lead()
 const results=await Promise.all([run('actor',()=>actions.initiateCallAction(row.id)),run('actor',()=>actions.initiateCallAction(row.id))])
 assert.equal(results.filter(r=>r.success).length,1)
 assert.equal(requests.filter(r=>r.body).length,1)
 assert.equal(await db.callRecord.count({where:{leadId:row.id}}),1)
})
test('provider rejection records a failed attempt without a fake connected lead',async()=>{
 providerError=true;const row=await lead()
 const result=await run('actor',()=>actions.initiateCallAction(row.id))
 assert.ok(result.error.includes('Smartflo API Error'))
 assert.equal((await db.callRecord.findFirst({where:{leadId:row.id}})).status,'FAILED')
 assert.equal((await db.lead.findUnique({where:{id:row.id}})).callStatus,'UNTOUCHED')
})
test('uncertain initiation is retained and blocks blind redialing',async()=>{
 networkError=true;const row=await lead()
 const result=await run('actor',()=>actions.initiateCallAction(row.id))
 assert.ok(result.error)
 assert.equal((await db.callRecord.findFirst({where:{leadId:row.id}})).status,'UNKNOWN')
 networkError=false
 const retry=await run('actor',()=>actions.initiateCallAction(row.id))
 assert.ok(retry.error);assert.equal(requests.filter(r=>r.body).length,1)
})
test('reconciling an older call does not overwrite a newer lead outcome',async()=>{
 const value=await start()
 await db.callRecord.create({data:{leadId:value.lead.id,userId:actor.id,smartfloRefId:'manual_'+randomUUID(),status:'COMPLETED',duration:60,createdAt:new Date(Date.now()+1000)}})
 await db.lead.update({where:{id:value.lead.id},data:{callStatus:'CALL_CONNECTED'}})
 records.set(value.ref,[final(value.ref,'missed',0)])
 await run('actor',()=>actions.checkCallStatusAction(value.ref))
 assert.equal((await db.lead.findUnique({where:{id:value.lead.id}})).callStatus,'CALL_CONNECTED')
})
