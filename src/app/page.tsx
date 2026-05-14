import { auth } from '@/auth'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { GUEST_COOKIE } from '@/lib/auth/session'
import { LandingAuth } from '@/components/auth/LandingAuth'

export default async function HomePage() {
  const session = await auth()

  if (session?.user) {
    redirect('/chat')
  }

  const cookieStore = await cookies()
  const hasGuestCookie = !!cookieStore.get(GUEST_COOKIE)?.value

  if (hasGuestCookie) {
    redirect('/chat')
  }

  return <LandingAuth />
}
