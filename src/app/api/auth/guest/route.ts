import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getOrCreateGuestUser } from '@/lib/redis/users'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const guestId: string = body.guestId ?? uuidv4()
  await getOrCreateGuestUser(guestId)
  return NextResponse.json({ guestId })
}
