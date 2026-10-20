'use server'
import { requireSales } from '@/lib/auth';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';


export async function getWebinarCategories() {
  await requireSales();

  return await prisma.webinarCategory.findMany({
    orderBy: { createdAt: 'asc' }
  })
}

export async function getWebinarOptionsAction() {
  await requireSales();

  return await prisma.webinarMaster.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getWebinars() {
  await requireSales();

  return await prisma.webinarMaster.findMany({
    include: {
      category: true,
      _count: {
        select: { leads: true }
      },
      recordings: true
    },
    orderBy: { date: 'desc' }
  })
}

export async function getWebinarById(id: string) {
  await requireSales();

  return await prisma.webinarMaster.findUnique({
    where: { id },
    include: {
      category: true,
      leads: true,

      recordings: true
    }
  })
}

export async function createWebinar(formData: FormData) {
  await requireSales(true);

  const categoryId = formData.get('categoryId') as string
  const name = formData.get('name') as string
  const dateStr = formData.get('date') as string
  const startTime = formData.get('startTime') as string || null
  const endTime = formData.get('endTime') as string || null
  const description = formData.get('description') as string || null
  const status = formData.get('status') as string || 'SCHEDULED'

  const category = await prisma.webinarCategory.findUnique({ where: { id: categoryId } })
  if (!category) throw new Error("Category not found")

  // Generate ID
  const latestWebinar = await prisma.webinarMaster.findFirst({
    where: { id: { startsWith: category.code } },
    orderBy: { id: 'desc' }
  })

  let nextNum = 1
  if (latestWebinar) {
    const parts = latestWebinar.id.split('-')
    if (parts.length === 2) {
      nextNum = parseInt(parts[1], 10) + 1
    }
  }
  const newId = `${category.code}-${String(nextNum).padStart(3, '0')}`

  const newWebinar = await prisma.webinarMaster.create({
    data: {
      id: newId,
      categoryId,
      name,
      date: new Date(dateStr),
      endDate: new Date(formData.get('endDate') as string),
      startTime,
      endTime,
      status,
      description,
      whatsappGroupUrl: formData.get('whatsappGroupUrl') as string,
      webinarUrl: formData.get('webinarUrl') as string || null
    }
  })

  revalidatePath('/webinars')
  return newWebinar
}

export async function updateWebinar(id: string, formData: FormData) {
  await requireSales(true);

  const categoryId = formData.get('categoryId') as string
  const name = formData.get('name') as string
  const dateStr = formData.get('date') as string
  const startTime = formData.get('startTime') as string || null
  const endTime = formData.get('endTime') as string || null
  const description = formData.get('description') as string || null
  const status = formData.get('status') as string || 'SCHEDULED'
  const whatsappGroupUrl = formData.get('whatsappGroupUrl') as string
  const webinarUrl = formData.get('webinarUrl') as string || null

  const updatedWebinar = await prisma.webinarMaster.update({
    where: { id },
    data: {
      categoryId,
      name,
      date: new Date(dateStr),
      endDate: new Date(formData.get('endDate') as string),
      startTime,
      endTime,
      status,
      description,
      whatsappGroupUrl,
      webinarUrl
    }
  })

  revalidatePath('/webinars')
  revalidatePath(`/webinars/${id}`)
  return updatedWebinar
}

export async function deleteWebinar(id: string) {
  await requireSales(true);

  // Check for associated leads
  const associatedLeads = await prisma.lead.count({ where: { webinarId: id } })
  if (associatedLeads > 0) {
    throw new Error('This webinar has associated leads and cannot be deleted.')
  }

  await prisma.webinarMaster.delete({ where: { id } })
  revalidatePath('/webinars')
}

export async function getWebinarAnalytics(webinarId: string) {
  await requireSales();

  const leads = await prisma.lead.findMany({
    where: { webinarId },
    select: { paymentStatus: true, totalPayment: true, leadStatus: true }
  })
  
  let totalPaid = 0;
  let zeroPayment = 0;
  let partPayment = 0;
  let fullPayment = 0;
  
  for (const lead of leads) {
    if (!lead.leadStatus?.startsWith('CLOSED')) {
      totalPaid += (lead.totalPayment || 0)
    }
    if (lead.paymentStatus === 'FULL_PAYMENT') fullPayment++
    else if (lead.paymentStatus === 'PART_PAYMENT') partPayment++
    else zeroPayment++
  }
  
  const totalLeads = leads.length
  const conversionPercent = totalLeads > 0 ? (((partPayment + fullPayment) / totalLeads) * 100).toFixed(2) + '%' : '-'
  
  const attendances = await prisma.webinarAttendance.findMany({ where: { webinarId } })
  const attended = new Set(attendances.map(a => a.email.toLowerCase().trim())).size
  
  return {
    totalPaid, zeroPayment, partPayment, fullPayment, totalLeads, conversionPercent, attended
  }
}


export async function createRecording(webinarId: string, formData: FormData) {
  await requireSales(true);

  const title = formData.get('title') as string
  const url = formData.get('url') as string
  const duration = formData.get('duration') as string || null
  const description = formData.get('description') as string || null

  const latestRec = await prisma.webinarRecording.findFirst({
    where: { id: { startsWith: 'REC-' } },
    orderBy: { id: 'desc' }
  })

  let nextNum = 1
  if (latestRec) {
    const parts = latestRec.id.split('-')
    if (parts.length === 2) {
      nextNum = parseInt(parts[1], 10) + 1
    }
  }
  const newId = `REC-${String(nextNum).padStart(3, '0')}`

  const newRec = await prisma.webinarRecording.create({
    data: {
      id: newId,
      webinarId,
      title,
      url,
      duration,
      description
    }
  })

  revalidatePath(`/webinars/${webinarId}`)
  return newRec
}

export async function updateRecording(webinarId: string, id: string, formData: FormData) {
  await requireSales(true);

  const title = formData.get('title') as string
  const url = formData.get('url') as string
  const duration = formData.get('duration') as string || null
  const description = formData.get('description') as string || null

  const updatedRec = await prisma.webinarRecording.update({
    where: { id },
    data: { title, url, duration, description }
  })

  revalidatePath(`/webinars/${webinarId}`)
  return updatedRec
}

export async function deleteRecording(webinarId: string, id: string) {
  await requireSales(true);

  await prisma.webinarRecording.delete({ where: { id } })
  revalidatePath(`/webinars/${webinarId}`)
}
