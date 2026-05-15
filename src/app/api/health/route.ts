import { NextResponse } from 'next/server'
import { getRedis } from '@/server/infrastructure/redis/client'

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
    console.error('[API /health] Redis check failed:', err)
    return NextResponse.json({ ok: false, redis: 'down' }, { status: 503 })
  }
}
