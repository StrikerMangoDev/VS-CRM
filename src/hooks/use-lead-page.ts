'use client'
import { useCallback,useEffect,useMemo,useRef,useState,type Dispatch,type SetStateAction } from 'react'
import toast from 'react-hot-toast'
import { getLeadPage,getLeadSelection } from '@/app/actions/lead-query'
import type { LeadPage,LeadQuery,LeadRow } from '@/lib/lead-query'

export function usePageNumber(filters: string) {
  const [state,setState]=useState({filters,page:1})
  const page=state.filters===filters?state.page:1
  const setPage: Dispatch<SetStateAction<number>> = next=>setState(previous=>({filters,page:typeof next==='function'?next(previous.filters===filters?previous.page:1):next}))
  return [page,setPage] as const
}
export function useLeadPage(initial: LeadPage, query: LeadQuery) {
  const key=JSON.stringify(query)
  const [result,setResult]=useState(initial)
  const [edited,setEdited]=useState({revision:initial.revision,rows:initial.rows})
  useEffect(()=>{
    let active=true
    getLeadPage(JSON.parse(key) as LeadQuery).then(value=>{if(active)setResult(value)}).catch(error=>{if(active)toast.error(error instanceof Error?error.message:'Unable to load leads')})
    return ()=>{active=false}
  },[key,initial.revision])
  const rows=edited.revision===result.revision?edited.rows:result.rows
  const setRows: Dispatch<SetStateAction<LeadRow[]>> = useCallback(next=>setEdited(previous=>({revision:result.revision,rows:typeof next==='function'?next(previous.revision===result.revision?previous.rows:result.rows):next})),[result])
  return {...result,rows,setRows}
}
export async function allMatchingLeads(query: LeadQuery): Promise<LeadRow[]> {
  const rows: LeadRow[]=[]
  const ids=await getLeadSelection(query)
  for(let offset=0;offset<ids.length;offset+=1000){const result=await getLeadPage({...query,ids:ids.slice(offset,offset+1000),page:1,size:1000});rows.push(...result.rows)}
  return rows
}
export function dateBounds(range: string, start: Date|null, end: Date|null, now=new Date()) {
  const day=new Date(now.getFullYear(),now.getMonth(),now.getDate())
  let from: Date|null=null,to: Date|null=null
  if(range==='custom'){from=start?new Date(start):null;to=end?new Date(end):null;from?.setHours(0,0,0,0);to?.setHours(23,59,59,999)}
  else if(range==='today'){from=day;to=new Date(day);to.setHours(23,59,59,999)}
  else if(range==='yesterday'){from=new Date(day);from.setDate(from.getDate()-1);to=new Date(from);to.setHours(23,59,59,999)}
  else if(range==='last7'||range==='last30'){from=new Date(day);from.setDate(from.getDate()-(range==='last7'?7:30));to=now}
  else if(range==='thisMonth'){from=new Date(now.getFullYear(),now.getMonth(),1);to=now}
  else if(range==='lastMonth'){from=new Date(now.getFullYear(),now.getMonth()-1,1);to=new Date(now.getFullYear(),now.getMonth(),0,23,59,59,999)}
  return {start:from?.toISOString(),end:to?.toISOString()}
}
export function followBounds(range: string, start: Date|null, end: Date|null, now: Date) {
  const today=new Date(now.getFullYear(),now.getMonth(),now.getDate()), endOf=(d:Date)=>{d.setHours(23,59,59,999);return d}
  let from:Date|undefined,to:Date|undefined
  if(range==='custom'){from=start||undefined;to=end||undefined}
  if(range==='due')to=endOf(new Date(today))
  if(range==='today'||range==='tomorrow'||range==='yesterday'){from=new Date(today);from.setDate(from.getDate()+(range==='tomorrow'?1:range==='yesterday'?-1:0));to=endOf(new Date(from))}
  if(range==='next7'){from=new Date(today);from.setDate(from.getDate()+1);to=new Date(today);to.setDate(to.getDate()+7);endOf(to)}
  if(range==='last7'){from=new Date(today);from.setDate(from.getDate()-7);to=new Date(today);to.setDate(to.getDate()-1);endOf(to)}
  return {followStart:from?.toISOString(),followEnd:to?.toISOString()}
}
export function useInfiniteLeadPage(initial: LeadPage, query: LeadQuery) {
  return useInfinitePage(initial,query,getLeadPage)
}
export function useInfinitePage<Q,T extends {rows:{id:string}[];page:number;size:number;total:number;revision:string}>(initial:T,query:Q,load:(query:Q&{page:number})=>Promise<T>) {
  const key=JSON.stringify(query), loading=useRef<symbol|null>(null)
  const [sentinel,setSentinel]=useState<HTMLTableRowElement|null>(null)
  const [state,setState]=useState({key,pages:[initial]})
  useEffect(()=>{
    let active=true;const request=Symbol();loading.current=request
    load({...JSON.parse(key),page:1}).then(page=>{if(active)setState({key,pages:[page]})}).catch(()=>{if(active)toast.error('Unable to load records')}).finally(()=>{if(loading.current===request)loading.current=null})
    return()=>{active=false}
  },[key,initial.revision,load])
  useEffect(()=>{
    // Observe the last real row: empty table rows can fall outside fractional scroll boundaries.
    const target=sentinel?.previousElementSibling||sentinel;if(!target)return
    let root=target.parentElement
    while(root&&!/(auto|scroll|overlay)/.test(getComputedStyle(root).overflowY))root=root.parentElement
    let active=true
    const observer=new IntersectionObserver(entries=>{
      const last=state.pages.at(-1)!
      if(!entries.some(e=>e.isIntersecting)||loading.current||state.key!==key||last.page*last.size>=last.total)return
      const request=Symbol();loading.current=request
      load({...JSON.parse(key),page:last.page+1}).then(page=>{if(active)setState(previous=>previous.key===key?{key,pages:page.page<=last.page?[page]:[...previous.pages,page]}:previous)}).catch(()=>{if(active)toast.error('Unable to load more records')}).finally(()=>{if(loading.current===request)loading.current=null})
    },{root,rootMargin:'150px 0px'})
    observer.observe(target);return()=>{active=false;observer.disconnect()}
  },[key,state,sentinel,load])
  const pages=state.key===key?state.pages:[]
  const rows=useMemo(()=>state.key===key?[...new Map(state.pages.flatMap(page=>page.rows).map(row=>[row.id,row])).values()] as T['rows']:[],[state,key])
  return [{...(pages[0]||initial),rows},setSentinel] as const
}
