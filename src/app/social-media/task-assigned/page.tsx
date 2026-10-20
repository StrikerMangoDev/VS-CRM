import { getSessionCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import TaskAssignedTable from '@/components/social-media/TaskAssignedTable';
import { prisma } from '@/lib/prisma';

export default async function TaskAssignedDashboard() {
  const sessionCookie = (await getSessionCookie());
  
  if (!sessionCookie) {
    redirect('/login');
  }

  const user = sessionCookie.user;

  // Fetch all users for the dropdown (perhaps restrict to Other Team if desired, but here we fetch all)
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, role: true, department: true }
  });

  // Fetch task records
  
  

  if (user.department === 'Posting Team') {
    redirect('/social-media/posting-sheet')
  }

  const data = await prisma.taskRecord.findMany({
    where: (user.department === 'Editing Team' || user.department === 'Graphics Team')
      ? {
          OR: [
            { assignedDepartment: user.department, assignedToId: null },
            { assignedToId: user.id }
          ]
        }
      : {},
    orderBy: { createdAt: 'desc' },
    include: {
      assignedTo: {
        select: { id: true, name: true, email: true, role: true, department: true }
      }
    }
  });

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div>
            <h1 style={{ color: 'var(--text-primary)', fontSize: '1.75rem', fontWeight: 700, margin: '0 0 8px 0' }}>
              Task Assigned
            </h1>
            <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
              {user.mainDepartment} / {user.department === 'ALL' ? 'All Teams' : user.department}
            </span>
          </div>
        </div>
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <TaskAssignedTable 
          initialData={data} 
          currentUserId={user.id} 
          currentUserRole={user.role} 
          users={users} 
        />
      </div>
    </>
  )
}
