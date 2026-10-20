import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { requireSales,requireUser,requireModuleAccess,type SessionUser } from './auth'

export type LeadSheet = 'MASTER' | 'EXTRA_DIALER' | 'DIALER' | 'PORTAL' | 'SALES' | 'RECOVERY' | 'TECHNICAL' | 'PART_PAYMENT' | 'FULL_PAYMENT' | 'ANALYTICS'
export type LeadQuery = {
  sheet: LeadSheet; page?: number; size?: number; closed?: boolean; webinar?: string; search?: string
  payment?: string; call?: string; log?: string; state?: string; whatsapp?: string; team?: string; executive?: string
  start?: string; end?: string; leadStatus?: string; amount?: string; min?: string; max?: string
  lastCallStart?: string; lastCallEnd?: string; followStart?: string; followEnd?: string
  tab?: 'daily_paid' | 'welcome_call' | 'access'; sort?: string; direction?: 'asc' | 'desc' | null
  idFrom?: string; idTo?: string; assignment?: string; ids?: string[]; analytics?: boolean; moduleId?:string; departmentId?:string
  portalColumn?: string; portalValue?: string
}
export const leadInclude = { assignments: { include: { user: { select: { id: true, name: true, department: true, subTeam: true, mainDepartment: true } } } }, callRecords: { orderBy: { createdAt: 'desc' as const }, take: 1 } } satisfies Prisma.LeadInclude
export type LeadRow = Prisma.LeadGetPayload<{ include: typeof leadInclude }> & { webinarAttendanceCount?: number }
export type LeadOptions = { webinars: string[]; states: string[]; calls: string[] }
export type LeadPage = { rows: LeadRow[]; total: number; page: number; size: number; options: LeadOptions; revision: string }
export type LeadBulkOption = Pick<LeadRow,'id'|'uniqueId'|'webinarId'|'webinarName'|'paymentStatus'> & {assignments:{user:{id:string;name:string;department:string}}[]}
export const dashboardLeadSelect = {
  id:true,webinarId:true,webinarName:true,state:true,callStatus:true,paymentStatus:true,totalPayment:true,partPaymentAmount:true,fullPaymentAmount:true,salesAmount:true,recoveryAmount:true,amount1:true,amount2:true,amount3:true,
  createdAt:true,updatedAt:true,updateStatusDate:true,paymentDate:true,nextFollowUpDate:true,leadStatus:true,currentModuleId:true,whatsappJoined:true,enrollmentCompleted:true,lmsAccessGranted:true,accessStatus:true,recoveryAssignedAt:true,
  assignments:leadInclude.assignments,callRecords:{orderBy:{createdAt:'desc' as const},take:1,select:{createdAt:true,duration:true,userId:true}},
} satisfies Prisma.LeadSelect
export type DashboardLead = Prisma.LeadGetPayload<{select:typeof dashboardLeadSelect}>
export type WebinarStats = {webinar:string;untouched:number;connected:number;notConnected:number;followUps:number;todayFollowUps:number;totalTechnical:number;whatsappPending:number;welcomePending:number;lmsPending:number}
const field = (name: string) => Prisma.raw(`l."${name}"`)
const contains = (name: string, value: string) => Prisma.sql`strpos(lower(coalesce(${field(name)}, '')), lower(${value})) > 0`
const assigned = (condition: Prisma.Sql) => Prisma.sql`EXISTS (SELECT 1 FROM "Assignment" a JOIN "User" u ON u.id=a."userId" WHERE a."leadId"=l.id AND ${condition})`
const webinar = Prisma.sql`coalesce(nullif(l."webinarId", ''), l."webinarName")`

export function leadScope(q: LeadQuery, user: SessionUser) {
  if (!['MASTER','EXTRA_DIALER','DIALER','PORTAL','SALES','RECOVERY','TECHNICAL','PART_PAYMENT','FULL_PAYMENT','ANALYTICS'].includes(q.sheet)) throw new Error('Invalid sheet')
  if (['MASTER','EXTRA_DIALER'].includes(q.sheet) && !['ADMIN','TL'].includes(user.role)) throw new Error('Forbidden')
  if (q.sheet === 'TECHNICAL' && user.role !== 'ADMIN' && user.department !== 'TECHNICAL' && user.department !== 'ALL') throw new Error('Forbidden')
  if (['PART_PAYMENT','FULL_PAYMENT'].includes(q.sheet) && user.role === 'EXEC' && user.department === 'SALES') throw new Error('Forbidden')
  const conditions: Prisma.Sql[] = []
  if(q.sheet==='PORTAL')conditions.push(Prisma.sql`l."currentModuleId"=${q.moduleId}`)
  if(q.sheet==='DIALER'){conditions.push(Prisma.sql`l."currentModuleId"='EXTRA_DIALER'`);if(user.role!=='ADMIN'&&user.department!=='ALL')conditions.push(assigned(Prisma.sql`u.id=${user.id}`))}
  if (q.sheet === 'EXTRA_DIALER') conditions.push(Prisma.sql`l."currentModuleId"='EXTRA_DIALER'`)
  if (['MASTER','SALES','RECOVERY'].includes(q.sheet) && !(q.analytics&&q.sheet==='RECOVERY')) conditions.push(Prisma.sql`l."currentModuleId" IS DISTINCT FROM 'EXTRA_DIALER'`)
  if (['SALES','RECOVERY'].includes(q.sheet)) {
    if(!q.analytics)conditions.push(q.closed ? Prisma.sql`l."leadStatus"='CLOSED'` : Prisma.sql`l."leadStatus"<>'CLOSED'`)
    conditions.push(user.role === 'ADMIN' || user.department === 'ALL' ? assigned(Prisma.sql`u.department=${q.sheet}`) : assigned(Prisma.sql`u.id=${user.id}`))
  }
  if (['PART_PAYMENT','FULL_PAYMENT'].includes(q.sheet)) conditions.push(Prisma.sql`l."paymentStatus"=${q.sheet}`)
  if(q.sheet==='ANALYTICS'&&user.role==='EXEC')conditions.push(assigned(Prisma.sql`u.id=${user.id}`))
  return conditions
}
export function leadFilters(q: LeadQuery) {
  const conditions: Prisma.Sql[] = []
  if(q.ids)conditions.push(q.ids.length?Prisma.sql`l.id=ANY(${q.ids}::text[])`:Prisma.sql`FALSE`)
  const master = ['MASTER','EXTRA_DIALER'].includes(q.sheet)
  if (q.search) conditions.push(q.sheet==='PORTAL' ? contains('customData',q.search) : Prisma.sql`(${Prisma.join((master ? ['uniqueId','name','mobileNumber','email','state'] : ['uniqueId','name','mobileNumber','email']).map(name=>contains(name,q.search!)), ' OR ')} ${master ? Prisma.sql`OR strpos(lower(coalesce(${webinar},'')),lower(${q.search}))>0` : Prisma.empty})`)
  if(q.sheet==='PORTAL'&&q.portalColumn&&q.portalValue)conditions.push(Prisma.sql`strpos(lower(coalesce((CASE WHEN l."customData" IS JSON OBJECT THEN l."customData"::json ELSE '{}'::json END)->>${q.portalColumn},'')),lower(${q.portalValue}))>0`)
  if (q.webinar) conditions.push(['PART_PAYMENT','FULL_PAYMENT'].includes(q.sheet) ? Prisma.sql`(l."webinarId"=${q.webinar} OR l."webinarName"=${q.webinar})` : Prisma.sql`${webinar}=${q.webinar}`)
  for (const [key,name] of [['payment','paymentStatus'],['state','state'],['leadStatus','leadStatus']] as const) if(q[key] && q[key]!=='all') conditions.push(Prisma.sql`${field(name)}=${q[key]}`)
  if (q.whatsapp) conditions.push(Prisma.sql`l."whatsappJoined"=${q.whatsapp==='JOINED'}`)
  if (q.call && q.call!=='all') {
    const upper=Prisma.sql`upper(coalesce(nullif(l."callStatus",''), 'UNTOUCHED'))`
    if(master && q.call==='CALL_CONNECTED') conditions.push(Prisma.sql`(${upper} LIKE '%CONNECTED%' AND ${upper} NOT LIKE '%NOT%')`)
    else if(master && q.call==='CALL_NOT_CONNECTED') conditions.push(Prisma.sql`${upper} LIKE '%NOT%'`)
    else if(q.call==='UNTOUCHED') conditions.push(master ? Prisma.sql`${upper}='UNTOUCHED'` : Prisma.sql`l."callStatus" NOT IN ('CALL_CONNECTED','CALL_NOT_CONNECTED')`)
    else conditions.push(Prisma.sql`l."callStatus"=${q.call}`)
  }
  if(q.log) conditions.push(Prisma.sql`coalesce(l."frozenLeadLogStatus", CASE WHEN l."recoveryAssignedAt" IS NULL OR floor(abs(extract(epoch from (now()-l."recoveryAssignedAt")))/86400)<=21 THEN 'Fresh Log' WHEN floor(abs(extract(epoch from (now()-l."recoveryAssignedAt")))/86400)<=81 THEN 'New Log' ELSE 'Old Log' END)=${q.log}`)
  if(q.executive==='UNASSIGNED' || q.assignment==='UNASSIGNED') conditions.push(Prisma.sql`NOT ${assigned(Prisma.sql`u.department<>'TECHNICAL'`)}`)
  if(q.executive==='UNASSIGNED'&&q.team)conditions.push(Prisma.sql`FALSE`)
  if(q.assignment==='ASSIGNED') conditions.push(assigned(Prisma.sql`u.department<>'TECHNICAL'`))
  if(q.team) conditions.push(assigned(Prisma.sql`u.department=${q.team}`))
  if(q.executive && q.executive!=='UNASSIGNED') conditions.push(assigned(Prisma.sql`u.id=${q.executive}`))
  for(const [start,end,column] of [[q.start,q.end,field('createdAt')],[q.followStart,q.followEnd,field('nextFollowUpDate')],[q.lastCallStart,q.lastCallEnd,Prisma.sql`(SELECT max(c."createdAt") FROM "CallRecord" c WHERE c."leadId"=l.id)`]] as const){
    if(start){if(!Number.isFinite(Date.parse(start)))throw new Error('Invalid date');conditions.push(Prisma.sql`${column}>=${new Date(start)}`)}
    if(end){if(!Number.isFinite(Date.parse(end)))throw new Error('Invalid date');conditions.push(Prisma.sql`${column}<=${new Date(end)}`)}
  }
  if(q.amount && q.amount!=='all') {
    if(q.amount==='between'){
      if(q.min && Number.isFinite(Number(q.min)))conditions.push(Prisma.sql`l."totalPayment">=${Number(q.min)}`)
      if(q.max && Number.isFinite(Number(q.max)))conditions.push(Prisma.sql`l."totalPayment"<=${Number(q.max)}`)
    }else if(['4000','8000','15999'].includes(q.amount))conditions.push(Prisma.sql`l."totalPayment"=${Number(q.amount)}`)
  }
  if(q.tab==='access')conditions.push(Prisma.sql`l."totalPayment">=8000`)
  if(q.tab==='welcome_call')conditions.push(Prisma.sql`l."paymentStatus"='FULL_PAYMENT' AND NOT l."enrollmentCompleted"`)
  if(q.idFrom)conditions.push(Prisma.sql`upper(l."uniqueId")>=upper(${q.idFrom})`)
  if(q.idTo)conditions.push(Prisma.sql`upper(l."uniqueId")<=upper(${q.idTo})`)
  return conditions
}
const where = (conditions: Prisma.Sql[]) => conditions.length ? Prisma.sql`WHERE ${Prisma.join(conditions,' AND ')}` : Prisma.empty
function order(q: LeadQuery) {
  const sorts: Record<string,Prisma.Sql> = {
    uniqueId:field('uniqueId'),name:Prisma.sql`lower(l.name)`,email:Prisma.sql`lower(coalesce(l.email,''))`,mobileNumber:field('mobileNumber'),
    webinarId:Prisma.sql`lower(coalesce(${webinar},''))`,state:Prisma.sql`lower(coalesce(l.state,''))`,totalPayment:field('totalPayment'),
    paymentStatus:Prisma.sql`CASE WHEN l."fullPaymentAmount">0 THEN 3 WHEN l."partPaymentAmount">0 THEN 2 ELSE 1 END`,whatsappJoined:field('whatsappJoined'),
    leadOwner:Prisma.sql`coalesce((SELECT lower(u.name) FROM "Assignment" a JOIN "User" u ON u.id=a."userId" WHERE a."leadId"=l.id AND u.department<>'TECHNICAL' ORDER BY a."createdAt",a.id LIMIT 1),'zzzz')`,createdAt:field('createdAt'),
  }
  return Prisma.sql`${q.direction===null?sorts.createdAt:sorts[q.sort||'createdAt']||sorts.uniqueId} ${q.direction==='asc'?Prisma.raw('ASC'):Prisma.raw('DESC')}, l.id ASC`
}
async function queryUser(q:LeadQuery){
  if(q.sheet==='PORTAL'){
    const module=await requireModuleAccess(q.moduleId||'',q.departmentId)
    if(q.portalColumn||q.portalValue){
      const columns:unknown=JSON.parse(module.columnsConfig||'[]')
      if(typeof q.portalColumn!=='string'||typeof q.portalValue!=='string'||q.portalValue.length>1000||!Array.isArray(columns)||!columns.some(col=>col&&col.id===q.portalColumn))throw new Error('Invalid portal filter')
    }
    return requireUser()
  }
  return requireSales()
}
export async function queryLeadPage(q: LeadQuery): Promise<LeadPage> {
  const user=await queryUser(q), scope=leadScope(q,user), conditions=[...scope,...leadFilters(q)]
  const size=Math.max(1,Math.min(1000,Math.floor(Number(q.size)||15))), requested=Math.max(1,Math.floor(Number(q.page)||1))
  return prisma.$transaction(async tx=>{
    const [count]=await tx.$queryRaw<{count:number}[]>(Prisma.sql`SELECT count(*)::int AS count FROM "Lead" l ${where(conditions)}`)
    const page=Math.min(requested,Math.max(1,Math.ceil(count.count/size)))
    const ids=await tx.$queryRaw<{id:string}[]>(Prisma.sql`SELECT l.id FROM "Lead" l ${where(conditions)} ORDER BY ${order(q)} LIMIT ${size} OFFSET ${(page-1)*size}`)
    const records=await tx.lead.findMany({where:{id:{in:ids.map(r=>r.id)}},include:leadInclude})
    const byId=new Map(records.map(r=>[r.id,r]))
    const attendance=await tx.webinarAttendance.findMany({where:{email:{in:records.flatMap(r=>r.email?[r.email.toLowerCase().trim()]:[])}},select:{email:true,webinarId:true,webinarDay:true},distinct:['email','webinarId','webinarDay']})
    const days=new Map<string,Set<string>>()
    for(const a of attendance){const key=a.email.toLowerCase().trim()+'_'+a.webinarId;if(!days.has(key))days.set(key,new Set());days.get(key)!.add(a.webinarDay)}
    const options=await tx.$queryRaw<{webinars:string[]|null;states:string[]|null;calls:string[]|null}[]>(Prisma.sql`SELECT array_agg(DISTINCT ${webinar}) FILTER(WHERE ${webinar} IS NOT NULL) AS webinars, array_agg(DISTINCT l.state) FILTER(WHERE l.state IS NOT NULL AND l.state<>'') AS states, array_agg(DISTINCT l."callStatus") FILTER(WHERE l."callStatus"<>'') AS calls FROM "Lead" l ${where(scope)}`)
    return {rows:ids.map(({id})=>{const r=byId.get(id)!;return {...r,webinarAttendanceCount:days.get((r.email||'').toLowerCase().trim()+'_'+r.webinarId)?.size||0}}),total:count.count,page,size,options:{webinars:options[0].webinars||[],states:options[0].states||[],calls:options[0].calls||[]},revision:new Date().toISOString()}
  },{isolationLevel:'RepeatableRead'})
}
export async function queryLeadSelection(q: LeadQuery) {
  const user=await queryUser(q),conditions=[...leadScope(q,user),...leadFilters(q)]
  const ids=await prisma.$queryRaw<{id:string}[]>(Prisma.sql`SELECT l.id FROM "Lead" l ${where(conditions)} ORDER BY ${order(q)}`)
  return ids.map(r=>r.id)
}
export async function queryLeadBulkOptions(sheet:'MASTER'|'EXTRA_DIALER') {
  if(!['MASTER','EXTRA_DIALER'].includes(sheet))throw new Error('Invalid sheet')
  const user=await requireSales(true),scope=leadScope({sheet},user)
  return prisma.$queryRaw<LeadBulkOption[]>(Prisma.sql`SELECT l.id,l."uniqueId",l."webinarId",l."webinarName",l."paymentStatus",
    (SELECT coalesce(json_agg(json_build_object('user',json_build_object('id',u.id,'name',u.name,'department',u.department)) ORDER BY a."createdAt",a.id),'[]'::json) FROM "Assignment" a JOIN "User" u ON u.id=a."userId" WHERE a."leadId"=l.id) AS assignments
    FROM "Lead" l ${where(scope)} ORDER BY l."createdAt" DESC,l.id`)
}
export async function queryWebinarStats(q: LeadQuery) {
  const user=await requireSales(),conditions=leadScope(q,user)
  conditions.push(Prisma.sql`l."webinarId" IS NOT NULL AND l."webinarId"<>''`)
  return prisma.$queryRaw<WebinarStats[]>(Prisma.sql`SELECT l."webinarId" AS webinar,
    count(*) FILTER(WHERE lower(l."callStatus")='untouched' OR l."callStatus"='')::int AS untouched,
    count(*) FILTER(WHERE l."callStatus"='CALL_CONNECTED')::int AS connected,
    count(*) FILTER(WHERE l."callStatus"='CALL_NOT_CONNECTED')::int AS "notConnected",
    count(*) FILTER(WHERE l."nextFollowUpDate" IS NOT NULL)::int AS "followUps",
    count(*) FILTER(WHERE (l."nextFollowUpDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date=(now() AT TIME ZONE 'Asia/Kolkata')::date)::int AS "todayFollowUps",
    count(*)::int AS "totalTechnical",count(*) FILTER(WHERE NOT l."whatsappJoined")::int AS "whatsappPending",
    count(*) FILTER(WHERE l."paymentStatus"='FULL_PAYMENT' AND NOT l."enrollmentCompleted")::int AS "welcomePending",
    count(*) FILTER(WHERE l."totalPayment">=8000 AND lower(l."accessStatus")='pending')::int AS "lmsPending"
    FROM "Lead" l ${where(conditions)} GROUP BY l."webinarId" ORDER BY max(l."createdAt") DESC,l."webinarId"`)
}
