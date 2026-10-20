import { getSessionCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import WebinarAttendanceUpload from '@/components/WebinarAttendanceUpload';
import { prisma } from '@/lib/prisma';

export default async function WebinarAttendanceUploadPage() {
  const sessionCookie = (await getSessionCookie())
  const auth = sessionCookie ? sessionCookie.user : null
  
  if (!auth) redirect('/login')
  if (auth.role !== 'ADMIN' && auth.role !== 'TL') redirect('/')

    
  const webinars = await prisma.webinarMaster.findMany({
    orderBy: { date: 'desc' },
    select: { id: true, name: true }
  })

  const history = await prisma.webinarAttendanceUpload.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return <WebinarAttendanceUpload webinars={webinars} history={history} />
}
