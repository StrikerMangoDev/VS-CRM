'use server'
import { requireSocial } from '@/lib/auth'
import { getSessionCookie } from '@/lib/auth'


import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

export interface TargetData {
  userId: string;
  team: string;
  weeklyVideos: number;
  monthlyVideos: number;
  weeklyGraphics: number;
  monthlyGraphics: number;
  weeklyPosts: number;
  monthlyPosts: number;
  weeklyStories: number;
  monthlyStories: number;
}

export async function getSocialMediaTargetsAction() {
  await requireSocial();

  let currentUser = null
  let canEdit = false

  try {
    await cookies();
    const sessionCookie = (await getSessionCookie())
    
    if (sessionCookie) {
      currentUser = sessionCookie.user
      canEdit = currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER'
    }
  } catch {
    // Called outside request scope or invalid cookie
  }

  // Fetch users strictly belonging to the 3 Social Media teams: Editing, Graphics, Posting
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      department: {
        in: ['Editing Team', 'Graphics Team', 'Posting Team']
      },
      role: { in: ['TL', 'EXEC'] }
    },
    include: {
      socialMediaTarget: true
    },
    orderBy: [
      { role: 'asc' }, // TL first, then EXEC
      { name: 'asc' }
    ]
  })

  // Format response strictly for Editing, Graphics, and Posting teams
  const formattedUsers = users
    .map(u => {
      let team: string | null = null
      const dept = u.department.toLowerCase()
      if (dept.includes('edit')) team = 'Editing Team'
      else if (dept.includes('graphic')) team = 'Graphics Team'
      else if (dept.includes('post')) team = 'Posting Team'

      if (!team) return null

      const target = u.socialMediaTarget

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role, // "TL" or "EXEC"
        department: u.department,
        mainDepartment: u.mainDepartment,
        team,
        target: {
          weeklyVideos: target?.weeklyVideos ?? 0,
          monthlyVideos: target?.monthlyVideos ?? 0,
          weeklyGraphics: target?.weeklyGraphics ?? 0,
          monthlyGraphics: target?.monthlyGraphics ?? 0,
          weeklyPosts: target?.weeklyPosts ?? 0,
          monthlyPosts: target?.monthlyPosts ?? 0,
          weeklyStories: target?.weeklyStories ?? 0,
          monthlyStories: target?.monthlyStories ?? 0,
        }
      }
    })
    .filter((u): u is NonNullable<typeof u> => u !== null)

  return {
    users: formattedUsers,
    canEdit,
    currentUser
  }
}

export async function saveSocialMediaTargetsAction(targets: TargetData[]) {
  await requireSocial(true);

  await cookies();
  const sessionCookie = (await getSessionCookie())
  
  if (!sessionCookie) {
    return { error: 'You must be logged in to update targets.' }
  }

  const currentUser = sessionCookie.user
  const canEdit = currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER'

  if (!canEdit) {
    return { error: 'Permission denied: Only Admin and Manager can edit targets.' }
  }

  try {
    // Process each target update
    for (const t of targets) {
      await prisma.socialMediaUserTarget.upsert({
        where: { userId: t.userId },
        create: {
          userId: t.userId,
          team: t.team,
          weeklyVideos: Math.max(0, Number(t.weeklyVideos) || 0),
          monthlyVideos: Math.max(0, Number(t.monthlyVideos) || 0),
          weeklyGraphics: Math.max(0, Number(t.weeklyGraphics) || 0),
          monthlyGraphics: Math.max(0, Number(t.monthlyGraphics) || 0),
          weeklyPosts: Math.max(0, Number(t.weeklyPosts) || 0),
          monthlyPosts: Math.max(0, Number(t.monthlyPosts) || 0),
          weeklyStories: Math.max(0, Number(t.weeklyStories) || 0),
          monthlyStories: Math.max(0, Number(t.monthlyStories) || 0),
        },
        update: {
          team: t.team,
          weeklyVideos: Math.max(0, Number(t.weeklyVideos) || 0),
          monthlyVideos: Math.max(0, Number(t.monthlyVideos) || 0),
          weeklyGraphics: Math.max(0, Number(t.weeklyGraphics) || 0),
          monthlyGraphics: Math.max(0, Number(t.monthlyGraphics) || 0),
          weeklyPosts: Math.max(0, Number(t.weeklyPosts) || 0),
          monthlyPosts: Math.max(0, Number(t.monthlyPosts) || 0),
          weeklyStories: Math.max(0, Number(t.weeklyStories) || 0),
          monthlyStories: Math.max(0, Number(t.monthlyStories) || 0),
        }
      })
    }

    revalidatePath('/settings/social-media-targets')
    revalidatePath('/reports')
    return { success: true }
  } catch (error) {
    console.error('Error saving targets:', error)
    return { error: `Failed to save targets: ${(error instanceof Error ? error.message : String(error))}` }
  }
}
