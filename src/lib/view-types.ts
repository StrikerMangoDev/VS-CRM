import type { AdCreativeRecord,ContentRecord,Issue,IssueDropdownValue,TaskRecord,User,SocialMediaUserTarget } from '@prisma/client'
import type { DashboardLead } from './lead-query'
import type { PublicUser } from './public-user'
export type Person = Pick<User,'id'|'name'|'department'> & Partial<Pick<PublicUser,'email'|'role'|'mainDepartment'|'subTeam'>> & {socialMediaTarget?:SocialMediaUserTarget|null}
export type DashboardUser = Pick<PublicUser,'id'|'name'|'role'|'department'|'mainDepartment'> & Partial<PublicUser> & {isAdmin?:boolean;isTL?:boolean}
export type LeadMetrics = Omit<DashboardLead,'assignments'|'callRecords'> & {
  assignments?: {id?:string;stage?:string;user:Person}[]
  callRecords?: {createdAt:Date|string;count?:number;duration?:number;userId?:string;user?:Person}[]
  auditLogs?: {createdAt:Date|string;newValue:string|null;count?:number}[]
  webinar?: {id?:string;name:string}|null
}
type ContentPerson = Pick<User,'id'|'name'> & Partial<Person>
export type ContentView = ContentRecord & {editor?:ContentPerson|null;approver?:ContentPerson|null;postedBy?:ContentPerson|null;graphicDesigner?:ContentPerson|null}
export type TaskView = TaskRecord & {assignedTo?:Person|null}
export type AdCreativeView = AdCreativeRecord & {editor?:Pick<User,'id'|'name'>|null}
export type IssueView = Issue & {issueType?:IssueDropdownValue|null;issueStatus?:IssueDropdownValue|null;actualIssue?:IssueDropdownValue|null;leadOwner?:Person|null;creator?:Person|null}
export type TopPerformer = {name:string;closed:number;conversion:number}
export type AttendanceUser = {id:string;userId:string;name:string;email:string;department:string;webinarId:string;days:string[];totalAttendance:number}
export type DateButtonProps = {value?:string;onClick?:React.MouseEventHandler<HTMLButtonElement>}
