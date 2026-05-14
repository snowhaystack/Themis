import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4, validate as isUUID } from 'uuid'
import { getOrCreateGuestUser } from '@/server/domain/identity/users'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))

  // Validate any client-supplied guestId to prevent Redis key injection.
  let guestId: string = uuidv4()
  if (typeof body.guestId === 'string') {
    if (!isUUID(body.guestId)) {
      return NextResponse.json({ error: 'Invalid guestId format' }, { status: 400 })
    }
    guestId = body.guestId
  }

  await getOrCreateGuestUser(guestId)
  return NextResponse.json({ guestId })
}
