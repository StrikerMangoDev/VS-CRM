import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { google } from 'googleapis'
import { getCurrentUser,cookieOptions,tokenHash } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { driveRedirectUri } from '@/lib/drive'
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(request.url), state = url.searchParams.get('state'), code = url.searchParams.get('code')
  const store = await cookies()
  if (!state || !/^[a-f0-9]{64}$/.test(state) || state !== store.get('vscrm_drive_state')?.value || !code) return NextResponse.json({ error: 'Invalid OAuth state' }, { status: 400 })
  const used = await prisma.securityAttempt.deleteMany({ where: { key: 'drive:' + user.id + ':' + tokenHash(state), expiresAt: { gt: new Date() } } })
  store.set('vscrm_drive_state', '', { ...cookieOptions, maxAge: 0 })
  if (used.count !== 1) return NextResponse.json({ error: 'Expired OAuth state' }, { status: 400 })
  try {
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, driveRedirectUri(request.url))
    const { tokens } = await auth.getToken(code)
    if (tokens.refresh_token) await prisma.integrationCredential.upsert({ where: { key: 'google-drive-refresh-token' }, create: { key: 'google-drive-refresh-token', value: tokens.refresh_token }, update: { value: tokens.refresh_token } })
    return NextResponse.redirect(new URL('/admin/file-manager?auth_success=1', process.env.APP_URL || url.origin))
  } catch { return NextResponse.json({ error: 'Google Drive authorization failed' }, { status: 502 }) }
}
