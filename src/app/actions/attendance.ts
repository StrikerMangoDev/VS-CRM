'use server'
import { requireRoles } from '@/lib/auth'
import { prisma,withLeadTransaction } from '@/lib/prisma'
import { readSheet } from 'read-excel-file/node'
import Papa from 'papaparse'

export async function uploadAttendanceAction(formData: FormData) {
  const user = await requireRoles('ADMIN', 'TL')
  const webinarId = String(formData.get('webinarId') || ''), webinarDay = String(formData.get('webinarDay') || '')
  const file = formData.get('file') as File
  const replaceExisting = formData.get('replaceExisting') === 'true'
  if (!webinarId || !webinarDay || !file || file.size > 20 * 1024 * 1024) throw new Error('Choose a CSV or XLSX file smaller than 20 MB')
  if (!await prisma.webinarMaster.findUnique({ where: { id: webinarId } })) throw new Error('Webinar not found')
  const buffer = Buffer.from(await file.arrayBuffer())
  let rows: Record<string, unknown>[]
  if (file.name.toLowerCase().endsWith('.csv')) {
    const parsed = Papa.parse<Record<string, string>>(buffer.toString('utf8'), { header: true, skipEmptyLines: true })
    if (parsed.errors.some(error => error.code !== 'UndetectableDelimiter')) throw new Error('Invalid CSV file')
    rows = parsed.data
  } else if (file.name.toLowerCase().endsWith('.xlsx')) {
    const [header, ...values] = await readSheet(buffer)
    if (!header) throw new Error('Empty spreadsheet')
    rows = values.map(row => Object.fromEntries(header.map((key, i) => [String(key || ''), row[i]])))
  } else throw new Error('Unsupported file format. Please upload CSV or XLSX.')
  const emails = new Set<string>()
  for (const row of rows) {
    const key = Object.keys(row).find(k => k.toLowerCase().includes('email'))
    const email = key ? String(row[key] || '').trim().toLowerCase() : ''
    if (!email) continue
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email in attendance file')
    emails.add(email)
  }
  if (!emails.size) throw new Error('No valid attendance emails found')
  return withLeadTransaction(async () => {
    const existing = await prisma.webinarAttendanceUpload.findMany({ where: { webinarId, webinarDay } })
    if (existing.length && !replaceExisting) return { success: false, error: 'EXISTS', message: 'Attendance for this webinar day already exists.' }
    if (existing.length) await prisma.webinarAttendanceUpload.deleteMany({ where: { id: { in: existing.map(u => u.id) } } })
    await prisma.webinarAttendanceUpload.create({ data: {
      webinarId, webinarDay, uploadedFile: file.name, uploadedBy: user.email, status: 'COMPLETED',
      records: { create: [...emails].map(email => ({ webinarId, webinarDay, email })) },
    } })
    return { success: true, message: 'Upload completed successfully', count: emails.size }
  })
}
export async function deleteAttendanceUploadAction(uploadId: string) {
  await requireRoles('ADMIN', 'TL')
  await prisma.webinarAttendanceUpload.delete({ where: { id: uploadId } })
  return { success: true }
}
