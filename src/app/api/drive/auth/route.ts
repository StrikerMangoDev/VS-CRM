import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomBytes } from 'node:crypto'
import { google } from 'googleapis'
import { getCurrentUser,cookieOptions,tokenHash } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { driveRedirectUri } from '@/lib/drive'
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return NextResponse.json({ error: 'Google Drive OAuth is not configured' }, { status: 503 })
  const state = randomBytes(32).toString('hex')
  await prisma.securityAttempt.create({ data: { key: 'drive:' + user.id + ':' + tokenHash(state), expiresAt: new Date(Date.now() + 600000) } })
  ;(await cookies()).set('vscrm_drive_state', state, { ...cookieOptions, maxAge: 600 })
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, driveRedirectUri(request.url))
  return NextResponse.redirect(auth.generateAuthUrl({ access_type: 'offline', scope: ['https://www.googleapis.com/auth/drive'], prompt: 'consent', state }))
}
