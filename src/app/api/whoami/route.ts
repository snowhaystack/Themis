import { NextRequest, NextResponse, userAgent } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface WhoAmI {
  ip: string
  browser: string
  os: string
  location: string
}

function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]?.trim() ?? ''
  return req.headers.get('x-real-ip')?.trim() ?? ''
}

function isPrivate(ip: string): boolean {
  return (
    !ip ||
    ip.startsWith('127.') ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('172.16.') ||
    ip === '::1'
  )
}

export async function GET(req: NextRequest) {
  const ip = clientIp(req)
  const ua = userAgent(req)
  const browser =
    [ua.browser.name, ua.browser.version].filter(Boolean).join(' ') || 'Unknown'
  const os = [ua.os.name, ua.os.version].filter(Boolean).join(' ') || 'Unknown'

  let location = 'Unknown'
  if (!isPrivate(ip)) {
    try {
      const r = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
        signal: AbortSignal.timeout(2500),
        headers: { 'User-Agent': 'Themis/1.0' },
      })
      if (r.ok) {
        const d = (await r.json()) as {
          city?: string
          country_name?: string
        }
        location =
          [d.city, d.country_name].filter(Boolean).join(', ') || 'Unknown'
      }
    } catch {
      // geo lookup is best-effort — leave as Unknown on failure
    }
  }

  const body: WhoAmI = { ip: ip || 'Unknown', browser, os, location }
  return NextResponse.json(body)
}
