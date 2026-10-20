'use server'
import { requireTeamAccess } from '@/lib/auth';

import { revalidatePath } from 'next/cache';
import { prisma,withLeadTransaction } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function createTeamMemberAction(formData: FormData) {
  return withLeadTransaction(async () => {

  await requireTeamAccess(undefined, { role: String(formData.get("role")), mainDepartment: String(formData.get("mainDepartment") || "Sales Department"), department: String(formData.get("department")) });

  const name = formData.get('name') as string
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const role = formData.get('role') as string
  const department = formData.get('department') as string
  const mainDepartment = formData.get('mainDepartment') as string || 'Sales Department'
  const employeeId = formData.get('employeeId') as string || null
  const mobileNumber = formData.get('mobileNumber') as string || null
  const password = formData.get('password') as string
  
  if (!name || !email || !role || !department) {
    return { error: 'Missing required fields' }
  }

  if (!['ADMIN', 'MANAGER', 'TL', 'EXEC'].includes(role)) return { error: 'Invalid role' }
  if (password && (password.length < 6 || password.length > 72)) return { error: 'Password must have 6 to 72 characters' }
  try {
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    await prisma.user.create({
      data: {
        name,
        email,
        employeeId,
        mobileNumber,
        role,
        mainDepartment,
        department,
        ...(hashedPassword && { password: hashedPassword })
      }
    })
    revalidatePath('/team')
    return { success: true }
  } catch (error) {
    return { error: `Failed to create user. ${(error instanceof Error ? error.message : String(error))}` }
  }

  });
}

export async function toggleUserStatusAction(userId: string, currentStatus: boolean) {
  return withLeadTransaction(async () => {

  await requireTeamAccess(userId);

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: !currentStatus, resetToken: null, resetTokenExpiry: null }
  })
  await prisma.session.deleteMany({ where: { userId } })
  revalidatePath('/team')

  });
}

export async function deleteUserAction(userId: string) {
  return withLeadTransaction(async () => {

  await requireTeamAccess(userId);

  // Check if user has active assignments
  const assignmentCount = await prisma.assignment.count({
    where: { userId }
  })
  
  if (assignmentCount > 0) {
    return { error: `Cannot delete user. They have ${assignmentCount} active assignments. Please transfer leads first.` }
  }

  await prisma.user.delete({
    where: { id: userId }
  })
  
  revalidatePath('/team')
  return { success: true }

  });
}

export async function transferLeadsAction(formData: FormData) {
  return withLeadTransaction(async () => {

  await requireTeamAccess(String(formData.get("fromUserId"))); await requireTeamAccess(String(formData.get("toUserId")));

  const fromUserId = formData.get('fromUserId') as string
  const toUserId = formData.get('toUserId') as string
  
  if (!fromUserId || !toUserId || fromUserId === toUserId) {
    return { error: 'Invalid user selection for transfer.' }
  }

  // Update all assignments from old user to new user
  await prisma.assignment.updateMany({
    where: { userId: fromUserId },
    data: { userId: toUserId }
  })

  revalidatePath('/team')
  revalidatePath('/')
  return { success: true }

  });
}

export async function editTeamMemberAction(formData: FormData) {
  return withLeadTransaction(async () => {

  await requireTeamAccess(String(formData.get("id")), { role: String(formData.get("role")), mainDepartment: String(formData.get("mainDepartment") || "Sales Department"), department: String(formData.get("department")) });

  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const role = formData.get('role') as string
  const department = formData.get('department') as string
  const mainDepartment = formData.get('mainDepartment') as string || 'Sales Department'
  const employeeId = formData.get('employeeId') as string || null
  const mobileNumber = formData.get('mobileNumber') as string || null
  const password = formData.get('password') as string
  
  if (!id || !name || !email || !role || !department) {
    return { error: 'Missing required fields' }
  }

  if (!['ADMIN', 'MANAGER', 'TL', 'EXEC'].includes(role)) return { error: 'Invalid role' }
  if (password && (password.length < 6 || password.length > 72)) return { error: 'Password must have 6 to 72 characters' }
  try {
    let hashedPassword = undefined;
    if (password && password.trim() !== '') {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    await prisma.user.update({
      where: { id },
      data: {
        resetToken: null,
        resetTokenExpiry: null,
        name,
        email,
        employeeId,
        mobileNumber,
        role,
        mainDepartment,
        department,
        ...(hashedPassword && { password: hashedPassword })
      }
    })
    await prisma.session.deleteMany({ where: { userId: id } })
    revalidatePath('/team')
    return { success: true }
  } catch (error) {
    return { error: `Failed to update user. ${(error instanceof Error ? error.message : String(error))}` }
  }

  });
}

export async function getLeadsCountByStatusAction(fromUserId: string, callStatus: string, webinar?: string) {
  await requireTeamAccess(fromUserId);

  try {
    const leadCondition: import('@prisma/client').Prisma.LeadWhereInput = {
      callStatus: callStatus
    };
    if (webinar && webinar.trim() !== '') {
      leadCondition.OR = [
        { webinarId: webinar },
        { webinarName: webinar }
      ];
    }

    const count = await prisma.assignment.count({
      where: {
        userId: fromUserId,
        lead: leadCondition
      }
    });
    return { count };
  } catch (error) {
    return { error: (error instanceof Error ? error.message : String(error)) };
  }
}

export async function transferLeadsBulkAction(fromUserId: string, toUserId: string, callStatus: string, count: number, webinar?: string) {
  return withLeadTransaction(async () => {

  await requireTeamAccess(fromUserId); await requireTeamAccess(toUserId);

  if (!fromUserId || !toUserId || fromUserId === toUserId || !count || count <= 0) {
    return { error: 'Invalid transfer parameters.' };
  }

  try {
    const leadCondition: import('@prisma/client').Prisma.LeadWhereInput = {
      callStatus: callStatus
    };
    if (webinar && webinar.trim() !== '') {
      leadCondition.OR = [
        { webinarId: webinar },
        { webinarName: webinar }
      ];
    }

    // Find up to `count` assignments matching the criteria
    const assignmentsToTransfer = await prisma.assignment.findMany({
      where: {
        userId: fromUserId,
        lead: leadCondition
      },
      orderBy: {
        createdAt: 'asc' // Transfer oldest assignments first
      },
      take: count,
      select: { id: true }
    });

    if (assignmentsToTransfer.length === 0) {
      return { error: 'No leads found matching the criteria.' };
    }

    const assignmentIds = assignmentsToTransfer.map(a => a.id);

    // Update the assignments
    await prisma.assignment.updateMany({
      where: {
        id: { in: assignmentIds }
      },
      data: {
        userId: toUserId
      }
    });

    revalidatePath('/team');
    revalidatePath('/');
    
    return { success: true, transferredCount: assignmentIds.length };
  } catch (error) {
    return { error: (error instanceof Error ? error.message : String(error)) };
  }

  });
}
