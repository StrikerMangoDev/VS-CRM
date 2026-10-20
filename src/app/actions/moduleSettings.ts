'use server'
import { requireRoles } from '@/lib/auth';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateModuleColumns(moduleId: string, columnsConfig: string) {
  await requireRoles("ADMIN");

  try {
    await prisma.orgModule.update({
      where: { id: moduleId },
      data: { columnsConfig }
    });
    revalidatePath(`/settings/departments/[id]/modules/[moduleId]`, 'page');
    revalidatePath(`/portal/[departmentId]/[moduleId]`, 'page');
    revalidatePath(`/`, 'layout'); // Just to be safe for sidebar
    return { success: true };
  } catch (error) {
    return { error: (error instanceof Error ? error.message : String(error)) };
  }
}
