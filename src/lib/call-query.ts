import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { requireSales,requireUser } from './auth'
import { leadInclude } from './lead-query'
import { refreshPendingCalls } from './smartflo'
export type CallQuery = {mode:'DIALER'|'HISTORY';page?:number;size?:number;search?:string;status?:string;leadStatus?:string;follow?:string;lastCall?:string;today?:string;start?:string;end?:string;caller?:string}
const include={lead:true,user:{select:{id:true,name:true}}} satisfies Prisma.CallRecordInclude
export type CallRow=Prisma.CallRecordGetPayload<{include:typeof include}>
export type CallPage={rows:CallRow[];page:number;size:number;total:number;duration:number;callers:string[];revision:string}
async function filters(q:CallQuery){
  const user=q.mode==='DIALER'?await requireSales():await requireUser(),where:Prisma.CallRecordWhereInput={}
  if(q.mode==='DIALER'){
    const lead:Prisma.LeadWhereInput={currentModuleId:'EXTRA_DIALER',...(user.role==='ADMIN'||user.department==='ALL'?{}:{assignments:{some:{userId:user.id}}})}
    if(q.search)lead.OR=[{mobileNumber:{contains:q.search}},{remark1:{contains:q.search,mode:'insensitive'}},{remark2:{contains:q.search,mode:'insensitive'}}]
    if(q.status&&q.status!=='ALL')lead.callStatus=q.status
    if(q.leadStatus==='ACTIVE')lead.leadStatus='IN_PROGRESS'
    if(q.leadStatus==='CLOSED')lead.leadStatus={not:'IN_PROGRESS'}
    const today=new Date(q.today||new Date().toISOString());if(!Number.isFinite(today.getTime()))throw new Error('Invalid date')
    const at=(days:number)=>new Date(today.getTime()+days*86400000)
    if(q.follow==='TODAY')lead.nextFollowUpDate={gte:today,lt:at(1)}
    if(q.follow==='PENDING')lead.nextFollowUpDate={lt:today}
    if(q.follow==='UPCOMING')lead.nextFollowUpDate={gte:at(1)}
    if(q.lastCall==='TODAY')where.createdAt={gte:today,lt:at(1)}
    if(q.lastCall==='YESTERDAY')where.OR=[{createdAt:{gte:at(-1),lt:today}},{createdAt:{gte:at(1),lt:at(2)}}]
    if(q.lastCall==='OLDER')where.OR=[{createdAt:{lt:at(-1)}},{createdAt:{gte:at(2)}}]
    where.lead=lead
  }else if(q.mode==='HISTORY'){
    if(!['ADMIN','MANAGER'].includes(user.role))where.userId=user.id
    if(q.start||q.end){if([q.start,q.end].some(d=>d&&!Number.isFinite(Date.parse(d))))throw new Error('Invalid date');where.createdAt={...(q.start?{gte:new Date(q.start)}:{}),...(q.end?{lte:new Date(q.end)}:{})}}
    if(q.search)where.OR=[{lead:{mobileNumber:{contains:q.search}}},{lead:{name:{contains:q.search,mode:'insensitive'}}},{lead:{uniqueId:{contains:q.search,mode:'insensitive'}}},...(['ADMIN','MANAGER'].includes(user.role)?[{user:{name:{contains:q.search,mode:'insensitive' as const}}}]:[])]
    if(q.caller&&q.caller!=='ALL')where.user={name:q.caller}
  }else throw new Error('Invalid call queue')
  return where
}
export async function queryCallPage(q:CallQuery):Promise<CallPage>{
  const where=await filters(q),size=Math.max(1,Math.min(1000,Math.floor(q.size||50)))
  const result=await prisma.$transaction(async tx=>{
    const total=await tx.callRecord.count({where}),page=Math.min(Math.max(1,Math.floor(q.page||1)),Math.max(1,Math.ceil(total/size)))
    const rows=await tx.callRecord.findMany({where,include,orderBy:[{createdAt:'desc'},{id:'asc'}],skip:(page-1)*size,take:size})
    const sums=await tx.callRecord.aggregate({where,_sum:{duration:true}})
    const callerScope=await filters({...q,search:undefined,caller:undefined})
    const callers=await tx.user.findMany({where:{callRecords:{some:callerScope}},select:{name:true},orderBy:{name:'asc'}})
    return{rows,page,size,total,duration:sums._sum.duration||0,callers:[...new Set(callers.map(u=>u.name))],revision:new Date().toISOString()}
  },{isolationLevel:'RepeatableRead'})
  if(await refreshPendingCalls(result.rows)){
    const rows=await prisma.callRecord.findMany({where:{id:{in:result.rows.map(row=>row.id)}},include})
    const byId=new Map(rows.map(row=>[row.id,row]))
    const sums=await prisma.callRecord.aggregate({where,_sum:{duration:true}})
    return {...result,rows:result.rows.map(row=>byId.get(row.id)||row),duration:sums._sum.duration||0}
  }
  return result
}
export async function queryCallLeadQueue(q:CallQuery){
  const where=await filters({...q,mode:'DIALER'})
  const calls=await prisma.callRecord.findMany({where,distinct:['leadId'],select:{leadId:true},orderBy:[{createdAt:'desc'},{id:'asc'}]})
  const rows=await prisma.lead.findMany({where:{id:{in:calls.map(c=>c.leadId)}},include:leadInclude})
  const byId=new Map(rows.map(r=>[r.id,r]));return calls.map(c=>byId.get(c.leadId)!)
}
