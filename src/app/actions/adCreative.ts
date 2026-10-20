'use server'
import { requireSocial } from '@/lib/auth'
import { getSessionCookie } from '@/lib/auth'


import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

const getTodayStr = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function getAdCreativeRecordsAction() {
  await requireSocial();

  let currentUser = null
  let canApprove = false

  try {
    await cookies();
    const sessionCookie = (await getSessionCookie())
    if (sessionCookie) {
      currentUser = sessionCookie.user
      canApprove = currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER'
    }
  } catch {
    // request scope fallback
  }

  // Fetch all editors & designers (Editing Team, Graphics Team or Social Media active users)
  const editors = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        { department: 'Editing Team' },
        { department: { contains: 'Edit' } },
        { department: 'Graphics Team' },
        { department: { contains: 'Graphic' } },
        { mainDepartment: 'Social Media' }
      ]
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true
    },
    orderBy: { name: 'asc' }
  })

  // Build filter for records
  const whereClause: import('@prisma/client').Prisma.AdCreativeRecordWhereInput = {}
  if (!canApprove) {
    whereClause.OR = [
      { editorId: currentUser?.id }
    ]
    const isEditing = currentUser?.department === 'Editing Team' || (currentUser?.department && currentUser.department.toLowerCase().includes('edit'))
    const isGraphics = currentUser?.department === 'Graphics Team' || (currentUser?.department && currentUser.department.toLowerCase().includes('graphic'))
    if (isEditing) {
      whereClause.mediaType = 'Video'
    } else if (isGraphics) {
      whereClause.mediaType = 'Graphics'
    }
  }

  // Fetch records
  const records = await prisma.adCreativeRecord.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: {
      editor: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true
        }
      }
    }
  })

  return {
    records,
    editors,
    currentUser,
    canApprove
  }
}

export async function createAdCreativeRecordAction(data: {
  mediaType?: string;
  videoName: string;
  forTarget: string;
  editorId?: string;
  videoLink?: string;
  status?: string;
  remark?: string;
}) {
  await requireSocial();

  try {
    await cookies();
    const sessionCookie = (await getSessionCookie())
    if (!sessionCookie) {
      return { error: 'You must be logged in.' }
    }

    const currentUser = sessionCookie.user
    const canApprove = currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER'
    const today = getTodayStr()
    const isComplete = data.status === 'Complete'

    let finalEditorId = data.editorId || null
    let finalEditorName: string | null = null
    let finalMediaType = data.mediaType || 'Video'

    // If not manager/admin, always auto-fill editor/designer directly from profile
    if (!canApprove || !finalEditorId) {
      finalEditorId = currentUser.id
      finalEditorName = currentUser.name
      const isEditing = currentUser.department === 'Editing Team' || (currentUser.department && currentUser.department.toLowerCase().includes('edit'))
      const isGraphics = currentUser.department === 'Graphics Team' || (currentUser.department && currentUser.department.toLowerCase().includes('graphic'))
      if (isEditing) finalMediaType = 'Video'
      else if (isGraphics) finalMediaType = 'Graphics'
    } else if (finalEditorId) {
      const ed = await prisma.user.findUnique({ where: { id: finalEditorId } })
      if (ed) finalEditorName = ed.name
    }

    const prefix = finalMediaType === 'Video' ? 'ADV-' : 'ADG-'
    
    // Fetch latest creativeId to compute next ID
    const latestRecord = await prisma.adCreativeRecord.findFirst({
      where: { mediaType: finalMediaType, creativeId: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { creativeId: true }
    })

    let nextNum = 1
    if (latestRecord && latestRecord.creativeId) {
      const match = latestRecord.creativeId.match(/-(\d+)$/)
      if (match) {
        nextNum = parseInt(match[1], 10) + 1
      }
    }
    const creativeId = `${prefix}${String(nextNum).padStart(4, '0')}`

    const record = await prisma.adCreativeRecord.create({
      data: {
        creativeId,
        mediaType: finalMediaType,
        videoName: data.videoName.trim(),
        forTarget: data.forTarget || 'Vastu Shikhar',
        editorId: finalEditorId,
        editorName: finalEditorName,
        videoLink: data.videoLink ? data.videoLink.trim() : null,
        status: data.status || 'pending',
        completedDate: isComplete ? today : null,
        remark: data.remark ? data.remark.trim() : null,
        approval: 'Pending',
        useStatus: 'pending',
        utilizeDate: null
      },
      include: {
        editor: {
          select: { id: true, name: true, email: true, role: true, department: true }
        }
      }
    })

    revalidatePath('/social-media/ad-creative-sheet')
    revalidatePath('/social-media/ad-creative-working-sheet')
    return { success: true, record }
  } catch (error) {
    console.error('Failed to create creative record:', error)
    return { error: (error instanceof Error ? error.message : String(error)) || 'Failed to create creative record' }
  }
}

export async function updateAdCreativeRecordAction(
  id: string,
  data: Partial<{
    videoName: string;
    forTarget: string;
    editorId: string | null;
    videoLink: string | null;
    status: string;
    completedDate: string | null;
    remark: string | null;
    approval: string;
    useStatus: string;
    utilizeDate: string | null;
  }>
) {
  await requireSocial();

  try {
    await cookies();
    const sessionCookie = (await getSessionCookie())
    if (!sessionCookie) {
      return { error: 'You must be logged in.' }
    }

    const currentUser = sessionCookie.user
    const canApprove = currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER'

    // Existing record check
    const existing = await prisma.adCreativeRecord.findUnique({ where: { id } })
    if (!existing) {
      return { error: 'Record not found.' }
    }

    // Approval permission check
    if (data.approval !== undefined && data.approval !== existing.approval) {
      if (!canApprove) {
        return { error: 'Permission denied: Only Manager or Admin can update approval.' }
      }
    }

    // Ownership check for non-managers/admins
    if (!canApprove && existing.editorId !== currentUser.id) {
      return { error: 'Permission denied: You can only edit your own creative records.' }
    }

    const today = getTodayStr()
    const allowed = ['videoName','forTarget','editorId','videoLink','status','completedDate','remark','approval','useStatus','utilizeDate'];
    if (Object.keys(data).some(key => !allowed.includes(key))) return { error: 'Invalid creative field' };
    const updateData: import('@prisma/client').Prisma.AdCreativeRecordUncheckedUpdateInput = Object.fromEntries(Object.entries(data).filter(([key]) => allowed.includes(key)));

    // An executive cannot reassign editor
    if (currentUser.role === 'EXEC') {
      delete updateData.editorId
      delete updateData.editorName
    }

    // Auto-fill completed date when status becomes "Complete"
    if (data.status !== undefined) {
      if (data.status === 'Complete') {
        if (!existing.completedDate && !data.completedDate) {
          updateData.completedDate = today
        }
      } else if (data.status !== 'Complete' && existing.status === 'Complete') {
        // If status moved back from Complete, optionally keep or clear
        // keep user's completedDate if provided, or leave as is
      }
    }

    // Auto-fill utilize date when useStatus becomes "utilize"
    if (data.useStatus !== undefined) {
      const lower = data.useStatus.toLowerCase()
      if (lower === 'utilize') {
        if (!existing.utilizeDate && !data.utilizeDate) {
          updateData.utilizeDate = today
        }
      }
    }

    // Update editorName if editorId changed
    if (currentUser.role !== 'EXEC' && data.editorId !== undefined) {
      if (data.editorId) {
        const ed = await prisma.user.findUnique({ where: { id: data.editorId } })
        updateData.editorName = ed ? ed.name : null
      } else {
        updateData.editorName = null
      }
    }

    const updated = await prisma.adCreativeRecord.update({
      where: { id },
      data: updateData,
      include: {
        editor: {
          select: { id: true, name: true, email: true, role: true, department: true }
        }
      }
    })

    revalidatePath('/social-media/ad-creative-sheet')
    revalidatePath('/social-media/ad-creative-working-sheet')
    return { success: true, record: updated }
  } catch (error) {
    console.error('Failed to update creative record:', error)
    return { error: (error instanceof Error ? error.message : String(error)) || 'Failed to update creative record' }
  }
}

export async function deleteAdCreativeRecordAction(id: string) {
  await requireSocial();

  try {
    await cookies();
    const sessionCookie = (await getSessionCookie())
    if (!sessionCookie) {
      return { error: 'You must be logged in.' }
    }

    const currentUser = sessionCookie.user
    const canApprove = currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER'

    const existing = await prisma.adCreativeRecord.findUnique({ where: { id } })
    if (!existing) {
      return { error: 'Record not found.' }
    }

    if (!canApprove && existing.editorId !== currentUser.id) {
      return { error: 'Permission denied: You can only delete your own creative entries.' }
    }

    await prisma.adCreativeRecord.delete({ where: { id } })
    revalidatePath('/social-media/ad-creative-sheet')
    revalidatePath('/social-media/ad-creative-working-sheet')
    return { success: true }
  } catch (error) {
    return { error: (error instanceof Error ? error.message : String(error)) || 'Failed to delete record' }
  }
}
