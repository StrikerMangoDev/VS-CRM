'use server'
import { requireRoles } from '@/lib/auth';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createConnection(formData: FormData) {
  await requireRoles("ADMIN");

  const sourceId = formData.get('sourceId') as string;
  const destId = formData.get('destId') as string;
  
  if (!sourceId || !destId || sourceId === destId) {
    return { error: 'Invalid source or destination' };
  }

  try {
    await prisma.orgConnection.create({
      data: {
        sourceId,
        destId,
        direction: 'ONE_WAY',
        syncEnabled: true
      }
    });
    revalidatePath('/settings/departments/[id]', 'page');
    return { success: true };
  } catch (error) {
    return { error: (error instanceof Error ? error.message : String(error)) };
  }
}

export async function deleteConnection(connectionId: string) {
  await requireRoles("ADMIN");

  try {
    await prisma.orgConnection.delete({
      where: { id: connectionId }
    });
    revalidatePath('/settings/departments/[id]', 'page');
    return { success: true };
  } catch (error) {
    return { error: (error instanceof Error ? error.message : String(error)) };
  }
}

export async function addTeam(departmentId: string, name: string) {
  await requireRoles("ADMIN");

  if (!name.trim()) return { error: 'Team name is required' };
  try {
    await prisma.orgTeam.create({
      data: {
        name,
        departmentId
      }
    });
    revalidatePath('/settings/departments/[id]', 'page');
    return { success: true };
  } catch (error) {
    return { error: (error instanceof Error ? error.message : String(error)) };
  }
}

export async function addModule(departmentId: string, name: string) {
  await requireRoles("ADMIN");

  if (!name.trim()) return { error: 'Module name is required' };
  try {
    await prisma.orgModule.create({
      data: {
        name,
        departmentId,
        type: 'SHEET'
      }
    });
    revalidatePath('/settings/departments/[id]', 'page');
    revalidatePath('/', 'layout'); // Update sidebar navigation
    return { success: true };
  } catch (error) {
    return { error: (error instanceof Error ? error.message : String(error)) };
  }
}
export async function updateTeamAccess(
  teamId: string, 
  name: string, 
  permittedModuleIds: string[],
  permissions: { performance: boolean; reports: boolean; incentives: boolean }
) {
  await requireRoles("ADMIN");

  if (!name.trim()) return { error: 'Team name is required' };
  try {
    // First update the name and the new analytics permissions
    await prisma.orgTeam.update({
      where: { id: teamId },
      data: { 
        name,
        canViewPerformance: permissions.performance,
        canViewReports: permissions.reports,
        canViewIncentives: permissions.incentives
      }
    });

    // Then update the many-to-many relationship with modules
    // We use 'set' to completely replace the existing relations with the new ones
    await prisma.orgTeam.update({
      where: { id: teamId },
      data: {
        permittedModules: {
          set: permittedModuleIds.map(id => ({ id }))
        }
      }
    });

    revalidatePath('/settings/departments/[id]', 'page');
    revalidatePath('/', 'layout'); // Update sidebar in case this affects the current user
    return { success: true };
  } catch (error) {
    return { error: (error instanceof Error ? error.message : String(error)) };
  }
}
