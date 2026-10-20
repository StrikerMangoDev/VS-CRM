import { getSessionCookie } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


async function getUser() {
  const sessionCookie = (await getSessionCookie());
  if (!sessionCookie) return null;
  return sessionCookie.user;
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const count = await prisma.issue.count({
      where: {
        leadOwnerId: null
      }
    });

    return NextResponse.json({ count });
  } catch (err) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}
