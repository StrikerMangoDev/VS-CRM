'use server'
import { getSessionCookie } from '@/lib/auth';


import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';


export async function addCustomColumnAction(data: { name: string; type: string; departmentTarget: string }) {
  await cookies();
  const sessionCookie = (await getSessionCookie())
  
  if (!sessionCookie) {
    return { success: false, error: 'Unauthorized' }
  }

  const user = sessionCookie.user
  if (user.role !== 'ADMIN') {
    return { success: false, error: 'Only admins can add columns' }
  }

  try {
    const column = await prisma.customColumn.create({
      data: {
        name: data.name,
        type: data.type,
        departmentTarget: data.departmentTarget
      }
    })
    
    // Revalidate paths to show the new column
    revalidatePath('/')
    revalidatePath('/part-payment')
    // Add other relevant paths if needed
    
    return { success: true, column }
  } catch (error) {
    console.error('Error adding column:', error)
    return { success: false, error: (error instanceof Error ? error.message : String(error)) }
  }
}

export async function deleteCustomColumnAction(id: string) {
  await cookies();
  const sessionCookie = (await getSessionCookie())
  
  if (!sessionCookie) {
    return { success: false, error: 'Unauthorized' }
  }

  const user = sessionCookie.user
  if (user.role !== 'ADMIN') {
    return { success: false, error: 'Only admins can delete columns' }
  }

  try {
    await prisma.customColumn.delete({
      where: { id }
    })
    
    // Revalidate paths to reflect deletion
    revalidatePath('/')
    revalidatePath('/part-payment')
    revalidatePath('/full-payment')
    revalidatePath('/sales')
    revalidatePath('/recovery')
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting column:', error)
    return { success: false, error: (error instanceof Error ? error.message : String(error)) }
  }
}
