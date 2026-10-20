'use server'
import { requireSocial } from '@/lib/auth'
import { getSessionCookie } from '@/lib/auth'


import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function getPostingDailyTasksAction() {
  await requireSocial();

  await cookies();
  const sessionCookie = (await getSessionCookie())
  if (!sessionCookie) throw new Error('Unauthorized')

  const user = sessionCookie.user
  const isAdmin = user.role === 'ADMIN'

  // If Admin, they can see everyone's data. If normal user, only their own.
  const records = await prisma.postingDailyTask.findMany({
    where: isAdmin ? {} : { userId: user.id },
    include: {
      user: { select: { name: true } }
    },
    orderBy: { date: 'desc' }
  })

  return { records }
}

export async function upsertPostingDailyTaskAction(data: {
  id?: string,
  date: string, // YYYY-MM-DD format
  polls: number,
  quizzes: number,
  communityPosts: number,
  commentsReply: number,
  captionsFound: number
}) {
  await requireSocial();

  await cookies();
  const sessionCookie = (await getSessionCookie())
  if (!sessionCookie) throw new Error('Unauthorized')

  const user = sessionCookie.user

  if ([data.polls,data.quizzes,data.communityPosts,data.commentsReply,data.captionsFound].some(n => !Number.isInteger(n) || n < 0)) throw new Error('Invalid task count');
  const dateObj = new Date(data.date)
  if (isNaN(dateObj.getTime())) throw new Error('Invalid date');
  
  if (data.id) {
    // Update
    return prisma.postingDailyTask.update({
      where: { id: data.id, ...(user.role === "ADMIN" ? {} : { userId: user.id }) },
      data: {
        date: dateObj,
        polls: data.polls,
        quizzes: data.quizzes,
        communityPosts: data.communityPosts,
        commentsReply: data.commentsReply,
        captionsFound: data.captionsFound
      }
    })
  } else {
    // Create or Update based on unique [userId, date]
    return prisma.postingDailyTask.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date: dateObj
        }
      },
      update: {
        polls: data.polls,
        quizzes: data.quizzes,
        communityPosts: data.communityPosts,
        commentsReply: data.commentsReply,
        captionsFound: data.captionsFound
      },
      create: {
        userId: user.id,
        date: dateObj,
        polls: data.polls,
        quizzes: data.quizzes,
        communityPosts: data.communityPosts,
        commentsReply: data.commentsReply,
        captionsFound: data.captionsFound
      }
    })
  }
}
