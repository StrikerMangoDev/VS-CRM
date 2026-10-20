'use server'
import { getSessionCookie } from '@/lib/auth';


import { prisma } from '@/lib/prisma';

async function getAdminUser() {
  const session = (await getSessionCookie())?.value
  if (!session) throw new Error('Unauthorized')
  const user = JSON.parse(session)
  if (user.role !== 'ADMIN') throw new Error('Forbidden')
  return user
}

export async function addDropdownValueAction(configId: string, value: string) {
  await getAdminUser()
  
  if (!value || value.trim() === '') throw new Error('Value cannot be empty')
  
  const existing = await prisma.dropdownValue.findFirst({
    where: { configId, value: value.trim() }
  })
  
  if (existing) throw new Error('Value already exists')
  
  await prisma.dropdownValue.create({
    data: {
      configId,
      value: value.trim()
    }
  })
  return { success: true }
}

export async function editDropdownValueAction(id: string, newValue: string) {
  await getAdminUser()
  
  if (!newValue || newValue.trim() === '') throw new Error('Value cannot be empty')
  
  const current = await prisma.dropdownValue.findUnique({ where: { id } })
  if (!current) throw new Error('Value not found')
  
  const existing = await prisma.dropdownValue.findFirst({
    where: { configId: current.configId, value: newValue.trim(), id: { not: id } }
  })
  if (existing) throw new Error('Value already exists')
  
  await prisma.dropdownValue.update({
    where: { id },
    data: { value: newValue.trim() }
  })
  return { success: true }
}

export async function deleteDropdownValueAction(id: string) {
  await getAdminUser()
  
  await prisma.dropdownValue.delete({
    where: { id }
  })
  return { success: true }
}

export async function addDropdownConfigurationAction(sheetName: string, columnName: string) {
  await getAdminUser()
  
  if (!sheetName || sheetName.trim() === '') throw new Error('Sheet Name cannot be empty')
  if (!columnName || columnName.trim() === '') throw new Error('Column Name cannot be empty')
  
  const existing = await prisma.dropdownConfiguration.findFirst({
    where: { sheetName: sheetName.trim(), columnName: columnName.trim() }
  })
  
  if (existing) throw new Error('Configuration already exists')
  
  await prisma.dropdownConfiguration.create({
    data: {
      sheetName: sheetName.trim(),
      columnName: columnName.trim()
    }
  })
  return { success: true }
}
