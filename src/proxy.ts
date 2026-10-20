import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { resolveSession,isSocial } from '@/lib/auth'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const user = await resolveSession(request.cookies.get('vscrm_session')?.value)
  const publicRoute = ['/login', '/forgot-password', '/reset-password'].includes(pathname)
  if (publicRoute) {
    return pathname === '/login' && user ? NextResponse.redirect(new URL('/performance', request.url)) : NextResponse.next()
  }
  if (!user) return pathname.startsWith('/api/')
    ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    : NextResponse.redirect(new URL('/login', request.url))
  let forbidden = false
  if (user.role !== 'ADMIN') {
    if (isSocial(user) && (pathname === '/' || ['/analytics', '/part-payment', '/full-payment', '/sales', '/recovery', '/technical', '/extra-dialer', '/extra-dialer-leads', '/webinars'].some(p => pathname === p || pathname.startsWith(p + '/')))) forbidden = true
    if (!isSocial(user) && pathname.startsWith('/social-media')) forbidden = true
    if (pathname.startsWith('/admin/') || pathname.startsWith('/api/drive/auth') || pathname.startsWith('/api/drive/callback')) forbidden = true
    if (pathname.startsWith('/reports') && !['TL', 'MANAGER'].includes(user.role)) forbidden = true
    if (['/settings/dropdowns', '/settings/issues', '/settings/webinar-attendance-upload'].some(p => pathname === p || pathname.startsWith(p + '/'))) forbidden = true
    if (pathname.startsWith('/settings/incentives') && !['TL', 'MANAGER'].includes(user.role)) forbidden = true
    if (pathname === '/team' && !(user.role === 'MANAGER' || (user.role === 'TL' && !isSocial(user)))) forbidden = true
    if (pathname.startsWith('/settings/social-') && !(user.role === 'MANAGER' && isSocial(user))) forbidden = true
    if (pathname.startsWith('/settings/sales-call-report') && (isSocial(user) || !['TL', 'MANAGER'].includes(user.role))) forbidden = true
    if (pathname.startsWith('/settings/whatsapp-templates') && (isSocial(user) || !['TL', 'MANAGER'].includes(user.role))) forbidden = true
  }
  if (forbidden) return pathname.startsWith('/api/') ? NextResponse.json({ error: 'Forbidden' }, { status: 403 }) : NextResponse.redirect(new URL('/performance', request.url))
  return NextResponse.next()
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png).*)'] }
