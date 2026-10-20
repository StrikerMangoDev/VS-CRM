'use server'
import type { Prisma } from '@prisma/client';
import { contentScope,requireContentAccess,requireSocial } from '@/lib/auth';
import { getSessionCookie } from '@/lib/auth';


import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Fetch content records for a specific channel
export async function getPendingCounts() {
  await requireSocial();

  try {
    const records = await prisma.contentRecord.findMany({
      where: {
        approvalStatus: 'Pending',
        sendTo: {
          in: ['Send for approval', 'Resend for approval (Revised)']
        }
      },
      select: { channel: true }
    });
    const counts: Record<string, number> = {};
    records.forEach(r => {
      if (r.channel) counts[r.channel] = (counts[r.channel] || 0) + 1;
    });
    
    const adCreativePending = await prisma.adCreativeRecord.count({
      where: {
        status: 'Complete',
        approval: 'Pending'
      }
    });
    counts['Ad Creative Sheet'] = adCreativePending;

    return { data: counts };
  } catch (error) {
    console.error('Error fetching pending counts:', error);
    return { error: 'Failed to fetch pending counts.' };
  }
}

export async function getRevisionCounts(userId: string) {
  const actor = await requireSocial();
  if (actor.role === 'EXEC' && actor.id !== userId) throw new Error('Forbidden');
  try {
    const counts: Record<string, boolean> = {
      'Editor Working Sheet': false,
      'Graphics Working Sheet': false,
      'Ad Creative Working Sheet': false,
      'Task Sheet': false
    };

    const revisionStatuses = ['Revision', 'Thumbnail Revision', 'Video Revision', 'Video and Thumbnail Revision'];

    // Editor Revisions
    const editorRev = await prisma.contentRecord.count({
      where: { 
        approvalStatus: { in: revisionStatuses }, 
        editorId: userId 
      }
    });
    if (editorRev > 0) counts['Editor Working Sheet'] = true;

    // Graphics Revisions
    const graphicsRev = await prisma.contentRecord.count({
      where: { 
        approvalStatus: { in: revisionStatuses }, 
        graphicDesignerId: userId 
      }
    });
    if (graphicsRev > 0) counts['Graphics Working Sheet'] = true;

    // Ad Creative Revisions
    const adRev = await prisma.adCreativeRecord.count({
      where: { 
        approval: { in: revisionStatuses }, 
        editorId: userId 
      }
    });
    if (adRev > 0) counts['Ad Creative Working Sheet'] = true;

    // Task Revisions
    const taskRev = await prisma.taskRecord.count({
      where: { status: 'Revision', assignedToId: userId }
    });
    if (taskRev > 0) counts['Task Sheet'] = true;

    return { data: counts };
  } catch (error) {
    console.error('Error fetching revision counts:', error);
    return { error: 'Failed' };
  }
}

// Fetch content records for a specific channel
export async function getContentRecords(channel: string) {
  const actor = await requireSocial();

  try {
    // 1. Auto-update Scheduled -> Uploaded if time has passed
    const now = new Date();
    const nowISOString = now.toISOString().split('T')[0];
    const nowTimeStr = now.toTimeString().split(' ')[0].substring(0, 5); // "HH:MM"

    const scheduledRecords = await prisma.contentRecord.findMany({
      where: { uploadingStatus: 'Scheduled', ...contentScope(actor) }
    });

    for (const record of scheduledRecords) {
      if (!record.uploadingDate || !record.uploadingTime) continue;
      
      const recordDate = new Date(record.uploadingDate).toISOString().split('T')[0];
      const recordTime = record.uploadingTime;
      
      if (recordDate < nowISOString || (recordDate === nowISOString && recordTime <= nowTimeStr)) {
        await prisma.contentRecord.update({
          where: { id: record.id },
          data: { uploadingStatus: 'Uploaded' }
        });
      }
    }

    // 2. Fetch records
    const records = await prisma.contentRecord.findMany({
      where: { ...(channel === 'ALL' ? {} : { channel }), ...contentScope(actor) },
      include: {
        editor: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
        postedBy: { select: { id: true, name: true } },
        graphicDesigner: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' }
    });
    return { data: records };
  } catch (error) {
    console.error('Error fetching content records:', error);
    return { error: 'Failed to fetch content records.' };
  }
}

const safeDate = (d: string | Date | null | undefined) => {
  if (!d) return null;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const revalidateAllContentPaths = () => {
  try {
    revalidatePath('/social-media/vs');
    revalidatePath('/social-media/lvs');
    revalidatePath('/social-media/malyam');
    revalidatePath('/social-media/ai-telmate');
    revalidatePath('/social-media/vedic-code');
    revalidatePath('/social-media/occult-sage');
    revalidatePath('/social-media/working-sheet');
    revalidatePath('/social-media/graphics-working-sheet');
    revalidatePath('/social-media/thumbnail-sheet');
    revalidatePath('/social-media/posting-sheet');
    revalidatePath('/social-media', 'layout');
  } catch (err) {
    console.warn('Revalidation warning:', err);
  }
};

// Create a new content record
export async function createContentRecord(channel: string, data: Partial<Prisma.ContentRecordUncheckedCreateInput>) {
  const actor = await requireSocial();
  if (actor.role === 'EXEC') {
    if (!['Editing Team','Graphics Team','Other Team'].includes(actor.department)) throw new Error('Forbidden');
    data = { ...data, editorId: ['Editing Team','Other Team'].includes(actor.department) ? actor.id : null, graphicDesignerId: actor.department === 'Graphics Team' ? actor.id : null, approvalStatus: 'Pending', approvedById: null };
  }

  try {
    const targetChannel = data.channel || (channel !== 'ALL' ? channel : 'VS Channel');

    // Generate Unique ID based on channel prefix
    let prefix = 'VS-';
    if (targetChannel === 'LVS Channel') prefix = 'LVS-';
    else if (targetChannel === 'Malyam Channel') prefix = 'MAL-';
    else if (targetChannel === 'AI Telmate') prefix = 'AI-';
    else if (targetChannel === 'Vedic Code') prefix = 'VC-';
    else if (targetChannel === 'Occult Sage') prefix = 'OS-';
    else if (targetChannel !== 'VS Channel') {
      // Dynamic channel: generate prefix from first letters or first two chars
      const words = targetChannel.split(' ').filter(Boolean);
      if (words.length > 1) {
        prefix = words.map((w: string) => w[0]).join('').substring(0, 3).toUpperCase() + '-';
      } else {
        prefix = targetChannel.substring(0, 3).toUpperCase() + '-';
      }
    }

    if (data.format === 'Graphics Task') {
      prefix = `GP-${prefix}`;
    }

    // Get highest existing ID for this prefix numerically to prevent any collision
    const existingRecords = await prisma.contentRecord.findMany({
      where: { uniqueId: { startsWith: prefix } },
      select: { uniqueId: true }
    });

    let maxNum = 0;
    for (const rec of existingRecords) {
      const match = rec.uniqueId.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) maxNum = num;
      }
    }

    let nextNumber = maxNum + 1;
    let uniqueId = `${prefix}${String(nextNumber).padStart(3, '0')}`;
    while (existingRecords.some((r) => r.uniqueId === uniqueId)) {
      nextNumber++;
      uniqueId = `${prefix}${String(nextNumber).padStart(3, '0')}`;
    }

    const newRecord = await prisma.contentRecord.create({
      data: {
        uniqueId,
        channel: targetChannel,
        topic: data.topic || 'Untitled',
        platform: data.platform || 'YouTube',
        format: data.format || 'Long Video',
        status: data.status || 'Pending',
        doneDate: safeDate(data.doneDate),
        remark: data.remark || null,
        videoLink: data.videoLink || null,
        thumbnail: data.thumbnail || null,
        thumbnailCount: data.thumbnailCount || null,
        graphicsCount: data.graphicsCount || null,
        thumbnailDoneDate: safeDate(data.thumbnailDoneDate),
        sendTo: data.sendTo || null,
        approvalStatus: data.approvalStatus || 'Pending',
        approvalDate: safeDate(data.approvalDate),
        approvedById: data.approvedById || null,
        postOnDate: safeDate(data.postOnDate),
        postedById: data.postedById || null,
        postedOnPlatform: data.postedOnPlatform || null,
        uploadingStatus: data.uploadingStatus || 'Pending',
        uploadingDate: safeDate(data.uploadingDate),
        scheduleVideo: Boolean(data.scheduleVideo),
        uploadingTime: data.uploadingTime || null,
        storyStatus: data.storyStatus || (data.format === 'Long Video' ? 'Pending' : null),
        editorId: data.editorId || null,
        graphicDesignerId: data.graphicDesignerId || null,
      }
    });

    revalidateAllContentPaths();

    return { success: true, data: newRecord };
  } catch (error) {
    console.error('Error creating content record:', error);
    return { error: (error instanceof Error ? error.message : String(error)) || 'Failed to create content record.' };
  }
}

// Update an existing content record
export async function updateContentRecord(id: string, data: Partial<Prisma.ContentRecordUncheckedCreateInput>) {
  const { user: actor, record: existing } = await requireContentAccess(id);
  if (actor.role === 'EXEC' && ['Posting Team','Thumbnail Team'].includes(actor.department)) {
    if (actor.department === 'Thumbnail Team' && existing.graphicDesignerId !== actor.id) throw new Error('Forbidden');
    const allowed = actor.department === 'Posting Team'
      ? ['postOnDate','postedById','postedOnPlatform','uploadingStatus','uploadingDate','scheduleVideo','uploadingTime','storyStatus','remark']
      : ['thumbnail','thumbnailCount','thumbnailDoneDate','sendTo','approvalStatus','remark'];
    for (const key of Object.keys(existing)) {
      if (data[key as keyof typeof data] === undefined || allowed.includes(key)) continue;
      const before = existing[key as keyof typeof existing];
      const previous = before instanceof Date ? before.toISOString().slice(0, 10) : before;
      const incoming = before instanceof Date && data[key as keyof typeof data] ? String(data[key as keyof typeof data]).slice(0, 10) : data[key as keyof typeof data];
      if ((incoming ?? '') !== (previous ?? '')) throw new Error('Forbidden');
    }
    if (actor.department === 'Posting Team' && data.postedById && data.postedById !== actor.id && data.postedById !== existing.postedById) throw new Error('Forbidden');
  }
  if (actor.role === 'EXEC') {
    const revision = ['Revision','Video Revision','Thumbnail Revision','Video and Thumbnail Revision'].includes(existing.approvalStatus);
    const handoff = (data.approvalStatus === 'Pending' && data.sendTo === 'Resend for approval (Revised)') || (data.approvalStatus === 'Thumbnail Revision' && data.sendTo === 'Send for thumbnail') || (data.approvalStatus === 'Video Revision' && data.sendTo === 'Send for approval');
    if (data.approvalStatus !== undefined && data.approvalStatus !== existing.approvalStatus && !(revision && handoff)) throw new Error('Forbidden');
    for (const key of ['editorId','graphicDesignerId','approvedById'] as const) {
      if (data[key] !== undefined && (data[key] || null) !== (existing[key] || null)) throw new Error('Forbidden');
    }
  }

  try {
    const updatedRecord = await prisma.contentRecord.update({
      where: { id },
      data: Object.fromEntries(Object.entries({
        topic: data.topic,
        channel: data.channel,
        platform: data.platform,
        format: data.format,
        status: data.status,
        doneDate: safeDate(data.doneDate),
        remark: data.remark || null,
        videoLink: data.videoLink || null,
        thumbnail: data.thumbnail || null,
        thumbnailCount: data.thumbnailCount || null,
        graphicsCount: data.graphicsCount || null,
        thumbnailDoneDate: safeDate(data.thumbnailDoneDate),
        sendTo: data.sendTo || null,
        approvalStatus: data.approvalStatus,
        approvalDate: safeDate(data.approvalDate),
        approvedById: data.approvedById || null,
        postOnDate: safeDate(data.postOnDate),
        postedById: data.postedById || null,
        postedOnPlatform: data.postedOnPlatform || null,
        uploadingStatus: data.uploadingStatus,
        uploadingDate: safeDate(data.uploadingDate),
        scheduleVideo: Boolean(data.scheduleVideo),
        uploadingTime: data.uploadingTime || null,
        storyStatus: data.storyStatus !== undefined ? data.storyStatus : undefined,
        editorId: data.editorId || null,
        graphicDesignerId: data.graphicDesignerId !== undefined ? (data.graphicDesignerId || null) : undefined,
      }).filter(([key]) => data[key as keyof typeof data] !== undefined))
    });

    revalidateAllContentPaths();

    return { success: true, data: updatedRecord };
  } catch (error) {
    console.error('Error updating content record:', error);
    return { error: (error instanceof Error ? error.message : String(error)) || 'Failed to update content record.' };
  }
}

// Delete a content record
export async function deleteContentRecord(id: string) {
  const { user, record } = await requireContentAccess(id);
  if (user.role === 'EXEC' && (user.department === 'Posting Team' || (user.department === 'Thumbnail Team' && record.graphicDesignerId !== user.id))) throw new Error('Forbidden');

  try {
    await prisma.contentRecord.delete({
      where: { id }
    });

    revalidateAllContentPaths();

    return { success: true };
  } catch (error) {
    console.error('Error deleting content record:', error);
    return { error: (error instanceof Error ? error.message : String(error)) || 'Failed to delete content record.' };
  }
}

// Helper to fetch users for dropdowns
export async function getUsersForDropdowns() {
  await requireSocial();

  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, role: true, mainDepartment: true, department: true },
      where: { 
        isActive: true,
        mainDepartment: 'Social Media' 
      },
      orderBy: { name: 'asc' }
    });
    return { data: users };
  } catch (error) {
    console.error('Error fetching users:', error);
    return { error: 'Failed to fetch users.' };
  }
}

export async function takeThumbnailTaskAction(recordId: string) {
  await requireSocial();

  try {
    const sessionCookie = (await getSessionCookie());
    if (!sessionCookie) return { error: 'Not authenticated' };
    const user = sessionCookie.user;

    if (!['Graphics Team','Thumbnail Team'].includes(user.department) && user.role !== 'ADMIN') throw new Error('Forbidden');
    const claim = await prisma.contentRecord.updateMany({
      where: { id: recordId, graphicDesignerId: null },
      data: {
        graphicDesignerId: user.id
      }
    });

    if (claim.count !== 1) return { error: 'Task has already been taken' };
    revalidateAllContentPaths();
    return { success: true };
  } catch (error) {
    console.error('Error taking thumbnail task:', error);
    return { error: 'Failed to take task.' };
  }
}
