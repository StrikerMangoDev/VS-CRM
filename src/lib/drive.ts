import { google } from 'googleapis'
import { prisma } from './prisma'
export async function getDriveAuth() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) throw new Error('Google Drive OAuth credentials are not configured')
  const stored = await prisma.integrationCredential.findUnique({ where: { key: 'google-drive-refresh-token' } })
  const token = stored?.value || process.env.GOOGLE_REFRESH_TOKEN
  if (!token) throw new Error('Google Drive authorization is not configured')
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
  auth.setCredentials({ refresh_token: token })
  return auth
}
export function driveRedirectUri(requestUrl: string) {
  return new URL('/api/drive/callback', process.env.APP_URL || new URL(requestUrl).origin).toString()
}
