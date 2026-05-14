import { auth } from '@/auth'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { GUEST_COOKIE } from '@/lib/auth/session'
import { ChatPage } from '@/components/chat/ChatPage'

export default async function ChatRoute() {
  const session = await auth()
  if (!session?.user) {
    const cookieStore = await cookies()
    const hasGuest = !!cookieStore.get(GUEST_COOKIE)?.value
    if (!hasGuest) redirect('/')
  }
  return <ChatPage />
}
