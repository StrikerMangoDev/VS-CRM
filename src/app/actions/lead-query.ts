'use server'
import { queryLeadPage,queryLeadSelection,queryWebinarStats,queryLeadBulkOptions,type LeadQuery } from '@/lib/lead-query'
import { queryCallPage,queryCallLeadQueue,type CallQuery } from '@/lib/call-query'
export async function getLeadPage(query: LeadQuery) { return queryLeadPage(query) }
export async function getLeadSelection(query: LeadQuery) { return queryLeadSelection(query) }
export async function getWebinarStats(query: LeadQuery) { return queryWebinarStats(query) }
export async function getCallPage(query:CallQuery){return queryCallPage(query)}
export async function getCallLeadQueue(query:CallQuery){return queryCallLeadQueue(query)}
export async function getLeadBulkOptions(sheet:'MASTER'|'EXTRA_DIALER'){return queryLeadBulkOptions(sheet)}
