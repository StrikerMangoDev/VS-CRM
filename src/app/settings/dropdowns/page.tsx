import { getSessionCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DropdownSettingsClient from '@/components/DropdownSettingsClient';
import { prisma } from '@/lib/prisma';

export default async function DropdownSettingsPage() {
  const sessionCookie = (await getSessionCookie())
  const auth = sessionCookie ? sessionCookie.user : null
  
  if (!auth) redirect('/login')
  if (auth.role !== 'ADMIN') redirect('/')

    
  const configs = await prisma.dropdownConfiguration.findMany({
    include: {
      values: {
        orderBy: { createdAt: 'asc' }
      }
    },
    orderBy: [
      { sheetName: 'asc' },
      { columnName: 'asc' }
    ]
  })

  return <DropdownSettingsClient configurations={configs} />
}
