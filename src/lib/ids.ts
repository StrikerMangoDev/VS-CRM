import { prisma } from './prisma'
export async function nextLeadId(webinarId: string | null, webinarName: string | null) {
  const webinar = Boolean(webinarId || webinarName)
  const leads = await prisma.lead.findMany({
    where: { uniqueId: { startsWith: webinar ? 'WEB-' : 'L-' } },
    select: { uniqueId: true, webinarId: true, webinarName: true },
    orderBy: { createdAt: 'desc' },
  })
  let prefix = 'L-'
  if (webinar) {
    const existing = leads.find(lead => ((webinarId && lead.webinarId === webinarId) || (webinarName && lead.webinarName === webinarName)) && /^WEB-\d+-\d+$/.test(lead.uniqueId))
    const group = existing?.uniqueId.match(/^WEB-(\d+)-/)?.[1]
    const maximum = leads.reduce((max, lead) => Math.max(max, Number(lead.uniqueId.match(/^WEB-(\d+)-\d+$/)?.[1] || 0)), 0)
    prefix = `WEB-${group || String(maximum + 1).padStart(2, '0')}-`
  }
  // Lead writers hold withLeadTransaction's lock; imported IDs need not be ordered.
  const maximum = leads.reduce((max, lead) => {
    const suffix = lead.uniqueId.startsWith(prefix) ? lead.uniqueId.slice(prefix.length) : ''
    return /^\d+$/.test(suffix) ? Math.max(max, Number(suffix)) : max
  }, webinar ? 0 : 1000)
  return prefix + String(maximum + 1).padStart(webinar ? 4 : 0, '0')
}

export async function nextRecordId(prefix: string, existingIds: string[], width = 3) {
  const maximum = existingIds.reduce((max, id) => {
    const suffix = id.startsWith(prefix) ? id.slice(prefix.length) : ''
    return /^\d+$/.test(suffix) ? Math.max(max, Number(suffix)) : max
  }, 0)
  const sequence = await prisma.recordSequence.upsert({
    where: { key: prefix }, create: { key: prefix, value: maximum + 1 },
    update: { value: { increment: 1 } },
  })
  return prefix + String(sequence.value).padStart(width, '0')
}

