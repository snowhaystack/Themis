import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { AdminDashboard } from '@/components/admin/AdminDashboard'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const session = await auth()

  if (!session?.user || session.user.role !== 'admin') {
    redirect('/login?callbackUrl=/admin')
  }

  return <AdminDashboard />
}
