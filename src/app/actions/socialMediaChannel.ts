'use server'
import { requireUser,requireSocial } from '@/lib/auth';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createSocialMediaChannelAction(data: { name: string; platforms: string; purpose?: string }) {
  await requireSocial(true);

  try {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    
    // Check if exists
    const existing = await prisma.socialMediaChannel.findFirst({
      where: {
        OR: [
          { name: data.name },
          { slug: slug }
        ]
      }
    });

    if (existing) {
      return { error: 'A channel with this name already exists.' };
    }

    const channel = await prisma.socialMediaChannel.create({
      data: {
        name: data.name,
        slug: slug,
        platforms: data.platforms,
        purpose: data.purpose || ''
      }
    });

    revalidatePath('/settings');
    revalidatePath('/social-media', 'layout');
    
    return { channel };
  } catch (error) {
    return { error: (error instanceof Error ? error.message : String(error)) };
  }
}

export async function getSocialMediaChannelsAction() {
  await requireUser();

  try {
    const channels = await prisma.socialMediaChannel.findMany({
      orderBy: { createdAt: 'asc' }
    });
    return { channels };
  } catch (error) {
    return { error: (error instanceof Error ? error.message : String(error)) };
  }
}

export async function deleteSocialMediaChannelAction(id: string) {
  await requireSocial(true);

  try {
    await prisma.socialMediaChannel.delete({
      where: { id }
    });
    revalidatePath('/settings');
    revalidatePath('/social-media', 'layout');
    return { success: true };
  } catch (error) {
    return { error: (error instanceof Error ? error.message : String(error)) };
  }
}
