import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { LandingAuth } from '@/components/auth/LandingAuth'

export default async function HomePage() {
  const session = await auth()

  if (session?.user) {
    redirect('/chat')
  }

  return <LandingAuth />
}
