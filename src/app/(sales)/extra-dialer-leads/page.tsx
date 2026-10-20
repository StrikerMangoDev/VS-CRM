import { getLeadPage } from '@/app/actions/lead-query';
import { getSessionCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import MasterLeadTable from '@/components/MasterLeadTable';
import NewLeadButton from '@/components/NewLeadButton';
import BulkUploadButton from '@/components/BulkUploadButton';
import { getDropdownsForSheet } from '@/lib/dropdowns';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';

// We need to instantiate Prisma inside the component or server action

export default async function ExtraDialerLeadsSheet() {
  const sessionCookie = (await getSessionCookie());
  
  if (!sessionCookie) {
    redirect('/login');
  }
  
  const user = sessionCookie.user;
  const isAdmin = user.role === 'ADMIN';
  const isTL = user.role === 'TL';

  // Non-admin and non-TL users are redirected to Performance page
  if (!isAdmin && !isTL) {
    redirect('/performance');
  }

  const initialPage = await getLeadPage({sheet:'EXTRA_DIALER'})

  // Only fetch Sales Department executives for assignments
  const executives = await prisma.user.findMany({
    where: { 
      role: 'EXEC',
      mainDepartment: 'Sales Department'
    }
  })

  const customColumns = await prisma.customColumn.findMany({
    where: { departmentTarget: 'MASTER' }
  })
  
  const callingSheetDropdowns = await getDropdownsForSheet('Leads Module')

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexShrink: 0 }}>
        <h1 style={{ color: 'var(--foreground)', fontSize: '1.5rem', fontWeight: 600 }}>Extra Dialer Leads</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {(isAdmin || isTL) && <BulkUploadButton customColumns={customColumns} baseColumns={['Name', 'Mobile', 'Email', 'Webinar ID', 'State']} />}
          {(isAdmin || isTL) && <NewLeadButton dropdowns={callingSheetDropdowns} />}
        </div>
      </div>

      <MasterLeadTable 
        initialPage={initialPage} 
        executives={executives} 
        isAdmin={isAdmin} 
        isTL={isTL} 
        customColumns={customColumns} 
        sheetName="EXTRA_DIALER" 
        dropdowns={callingSheetDropdowns}
      />
    </>
  )
}
