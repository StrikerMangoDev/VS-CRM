const assert=require('node:assert/strict'),{randomBytes,createHash}=require('node:crypto')
const {PrismaClient}=require('@prisma/client'),{PrismaPg}=require('@prisma/adapter-pg'),{Pool}=require('pg')
assert.ok(['https://vscrm.orgogo.com','https://vscrm-136-83-129-156.sslip.io'].includes(process.env.APP_URL))
const pool=new Pool({connectionString:process.env.DATABASE_URL}),db=new PrismaClient({adapter:new PrismaPg(pool)})
const token=randomBytes(32).toString('hex'),tokenHash=createHash('sha256').update(token).digest('hex')
async function main(){
  const user=await db.user.findUniqueOrThrow({where:{email:'strikersoftwarepvt@gmail.com'}})
  assert.equal(user.role,'ADMIN');assert.equal(user.isActive,true)
  await db.session.create({data:{tokenHash,userId:user.id,expiresAt:new Date(Date.now()+300000)}})
  const routes=['/','/sales','/recovery','/technical','/reports','/performance','/team','/settings','/incentives','/webinars'],timings=[]
  for(let round=0;round<3;round++)await Promise.all(routes.map(async route=>{
    const started=Date.now(),response=await fetch(process.env.APP_URL+route,{headers:{cookie:'vscrm_session='+token},redirect:'manual',signal:AbortSignal.timeout(30000)})
    const body=await response.text();assert.equal(response.status,200,route);assert.ok(!body.includes('Application error: a server-side exception'),route)
    timings.push(Date.now()-started)
  }))
  console.log(JSON.stringify({checks:30,concurrency:10,maxMs:Math.max(...timings),averageMs:Math.round(timings.reduce((a,b)=>a+b,0)/timings.length)}))
}
main().catch(error=>{console.error(error.message);process.exitCode=1}).finally(async()=>{await db.session.deleteMany({where:{tokenHash}});await db.$disconnect();await pool.end()})
