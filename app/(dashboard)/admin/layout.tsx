import { checkAdminAuth } from '@/lib/admin/auth'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // This will redirect if not admin
  await checkAdminAuth()
  
  return <>{children}</>
}