import { NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const pong = await getRedis().ping()
    return NextResponse.json({
      ok: true,
      redis: pong === 'PONG' ? 'up' : 'down',
      ts: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 503 }
    )
  }
}
