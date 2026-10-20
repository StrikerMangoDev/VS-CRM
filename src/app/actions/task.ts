'use server'
import type { Prisma } from '@prisma/client';
import { requireTaskAccess } from '@/lib/auth';

import { nextRecordId } from '@/lib/ids';
import { prisma } from '@/lib/prisma';


export async function createTask(data: Omit<Prisma.TaskRecordUncheckedCreateInput,'uniqueId'>) {
  await requireTaskAccess(undefined, "create");

  try {
    // Generate a unique ID (e.g. TSK-001)
    const ids = await prisma.taskRecord.findMany({ select: { uniqueId: true } })
    const uniqueId = await nextRecordId('TSK-', ids.map(i => i.uniqueId))
    
    const newTask = await prisma.taskRecord.create({
      data: {
        uniqueId,
        departmentName: data.departmentName,
        assigningDate: data.assigningDate || new Date().toISOString().split('T')[0],
        requirementDate: data.requirementDate,
        platform: data.platform,
        topic: data.topic,
        requirementPurpose: data.requirementPurpose,
        referenceFile: data.referenceFile,
        format: data.format,
        size: data.size,
        videoLink: data.videoLink,
        graphicsCount: data.graphicsCount,
        remark: data.remark,
        assignedDepartment: data.assignedDepartment || null,
        assignedToId: data.assignedToId || null,
        status: data.status || 'Pending'
      }
    })
    return { success: true, data: newTask }
  } catch (error) {
    console.error('Failed to create task:', error)
    return { success: false, error: (error instanceof Error ? error.message : String(error)) }
  }
}

export async function updateTask(id: string, data: Partial<Prisma.TaskRecordUncheckedCreateInput>) {
  const actor = await requireTaskAccess(id);
  const reviewer = ['ADMIN','MANAGER'].includes(actor.role) || actor.department === 'Other Team';
  if (!reviewer) {
    const existing = await prisma.taskRecord.findUniqueOrThrow({ where: { id } });
    if (data.assignedToId !== undefined && (data.assignedToId || null) !== existing.assignedToId) throw new Error('Forbidden');
    if (['Completed','Revision'].includes(data.status || '')) throw new Error('Forbidden');
  }

  try {
    const updated = await prisma.taskRecord.update({
      where: { id },
      data: {
        departmentName: data.departmentName,
        assigningDate: data.assigningDate,
        requirementDate: data.requirementDate,
        platform: data.platform,
        topic: data.topic,
        requirementPurpose: data.requirementPurpose,
        referenceFile: data.referenceFile,
        format: data.format,
        size: data.size,
        videoLink: data.videoLink,
        graphicsCount: data.graphicsCount,
        remark: data.remark,
        assignedDepartment: data.assignedDepartment || null,
        assignedToId: data.assignedToId || null,
        status: data.status
      }
    })
    return { success: true, data: updated }
  } catch (error) {
    console.error('Failed to update task:', error)
    return { success: false, error: (error instanceof Error ? error.message : String(error)) }
  }
}

export async function deleteTask(id: string) {
  await requireTaskAccess(id, "delete");

  try {
    await prisma.taskRecord.delete({ where: { id } })
    return { success: true }
  } catch (error) {
    console.error('Failed to delete task:', error)
    return { success: false, error: (error instanceof Error ? error.message : String(error)) }
  }
}

export async function takeTask(id: string, userId: string) {
  await requireTaskAccess(id);

  try {
    const actor = await requireTaskAccess(id);
    if (actor.id !== userId) return { success: false, error: 'Forbidden' };
    const claim = await prisma.taskRecord.updateMany({ where: { id, assignedToId: null, assignedDepartment: actor.department }, data: { assignedToId: actor.id } });
    if (claim.count !== 1) return { success: false, error: 'Task has already been taken' };
    const updated = await prisma.taskRecord.findUniqueOrThrow({ where: { id } });
    return { success: true, data: updated }
  } catch (error) {
    console.error('Failed to take task:', error)
    return { success: false, error: (error instanceof Error ? error.message : String(error)) }
  }
}
