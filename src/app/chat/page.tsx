import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { ChatPage } from '@/components/chat/ChatPage'

export default async function ChatRoute() {
  const session = await auth()
  if (!session?.user) redirect('/')
  return <ChatPage />
}
