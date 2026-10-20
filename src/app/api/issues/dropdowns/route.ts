import { getSessionCookie } from '@/lib/auth';
import { NextRequest,NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


async function getUser() {
  const sessionCookie = (await getSessionCookie());
  if (!sessionCookie) return null;
  return sessionCookie.user;
}

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  
  const where: import('@prisma/client').Prisma.IssueDropdownValueWhereInput = { isActive: true };
  if (type) where.type = type;

  const dropdowns = await prisma.issueDropdownValue.findMany({
    where,
    orderBy: { createdAt: 'asc' }
  });

  return NextResponse.json(dropdowns);
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { type, value } = await req.json();

  if (!type || !value) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const dropdown = await prisma.issueDropdownValue.create({
    data: {
      type,
      value,
      isActive: true
    }
  });

  return NextResponse.json(dropdown);
}

export async function PUT(req: NextRequest) {
  const user = await getUser();
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, value, isActive } = await req.json();

  if (!id) {
    return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
  }

  const data: import('@prisma/client').Prisma.IssueDropdownValueUncheckedUpdateInput = {};
  if (value !== undefined) data.value = value;
  if (isActive !== undefined) data.isActive = isActive;

  const dropdown = await prisma.issueDropdownValue.update({
    where: { id },
    data
  });

  return NextResponse.json(dropdown);
}
