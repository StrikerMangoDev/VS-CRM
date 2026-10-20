import { prisma } from './prisma'
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

