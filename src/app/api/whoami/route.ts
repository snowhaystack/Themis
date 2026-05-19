import { NextRequest, NextResponse, userAgent } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface WhoAmI {
  ip: string
  browser: string
  os: string
  device: string
  engine: string
  location: string
  isp: string
  timezone: string
  lat: string
  lon: string
  lang: string
  connection: string
  screenHint: string
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

  const device = ua.device.type
    ? `${ua.device.vendor ?? ''} ${ua.device.model ?? ''} (${ua.device.type})`.trim()
    : 'Desktop'
  const engine = [ua.engine.name, ua.engine.version].filter(Boolean).join(' ') || 'Unknown'
  const lang = req.headers.get('accept-language')?.split(',')[0]?.trim() ?? 'Unknown'
  const connection = req.headers.get('connection') ?? 'Unknown'
  const screenHint = req.headers.get('sec-ch-ua-platform') ?? os

  let location = 'Unknown'
  let isp = 'Unknown'
  let timezone = 'Unknown'
  let lat = ''
  let lon = ''

  if (!isPrivate(ip)) {
    try {
      const r = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
        signal: AbortSignal.timeout(2500),
        headers: { 'User-Agent': 'Themis/1.0' },
      })
      if (r.ok) {
        const d = (await r.json()) as {
          city?: string
          region?: string
          country_name?: string
          org?: string
          timezone?: string
          latitude?: number
          longitude?: number
        }
        location = [d.city, d.region, d.country_name].filter(Boolean).join(', ') || 'Unknown'
        isp = d.org ?? 'Unknown'
        timezone = d.timezone ?? 'Unknown'
        lat = d.latitude?.toFixed(4) ?? ''
        lon = d.longitude?.toFixed(4) ?? ''
      }
    } catch {
      // geo lookup is best-effort
    }
  }

  const body: WhoAmI = {
    ip: ip || 'Unknown',
    browser,
    os,
    device,
    engine,
    location,
    isp,
    timezone,
    lat,
    lon,
    lang,
    connection,
    screenHint,
  }
  return NextResponse.json(body)
}
