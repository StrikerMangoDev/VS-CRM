import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const numberFields = ['webinarTarget','webinarWeightage','webinarMaximumCap','callingTarget','callingWeightage','callingMaximumCap','revenueTarget','revenueWeightage','pipThreshold','noIncentiveStart','noIncentiveEnd','fixedIncentiveStart','fixedIncentiveEnd','fixedIncentiveAmount','additionalIncentiveStart','additionalIncentivePerPercentage']
async function permitted() {
  const user = await getCurrentUser()
  return user && ['ADMIN', 'TL'].includes(user.role)
}
export async function GET() {
  if (!await permitted()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const config = await prisma.incentiveConfiguration.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} })
  return NextResponse.json(config)
}
export async function POST(request: Request) {
  if (!await permitted()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { ...data } = await request.json()
    for (const [key, value] of Object.entries(data)) {
      if (key === 'revenueHasCap') { if (typeof value !== 'boolean') throw new Error('Invalid cap'); continue }
      if (!numberFields.includes(key) || typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('Invalid incentive value')
      if (['webinarTarget', 'callingTarget', 'revenueTarget'].includes(key) && value === 0) throw new Error('Targets must be greater than zero')
    }
    const config = await prisma.incentiveConfiguration.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } })
    return NextResponse.json(config)
  } catch {
    return NextResponse.json({ error: 'Invalid incentive configuration' }, { status: 400 })
  }
}
