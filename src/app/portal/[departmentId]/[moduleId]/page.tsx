import { getLeadPage } from '@/app/actions/lead-query';
import { requireModuleAccess } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import DynamicDataTable from '@/components/portal/DynamicDataTable';

export const dynamic = 'force-dynamic';

export default async function PortalDynamicSheetPage({ params }: { params: Promise<{ departmentId: string, moduleId: string }> }) {
  const resolvedParams = await params;
  await requireModuleAccess(resolvedParams.moduleId, resolvedParams.departmentId);
  
  const orgModule = await prisma.orgModule.findUnique({
    where: { id: resolvedParams.moduleId },
    include: {
      department: true
    }
  });

  if (!orgModule) {
    return notFound();
  }

  const initialPage=await getLeadPage({sheet:'PORTAL',moduleId:orgModule.id,departmentId:orgModule.departmentId,size:50})

  return (
    <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <DynamicDataTable 
        module={orgModule} 
        department={orgModule.department} 
        initialPage={initialPage} 
      />
    </div>
  );
}
