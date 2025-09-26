import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth/auth-helpers'
import { DashboardNav } from '@/components/dashboard/nav'
import { UserMenu } from '@/components/dashboard/user-menu'
import { permanentLogger } from '@/lib/utils/permanent-logger'
// New enterprise notification system - only in dashboard
import { NotificationListV2 } from '@/components/ui/notification-list-v2'

export const dynamic = 'force-dynamic'

// ✅ CLAUDE.md Compliance:
// - NO client-side profile creation (Line 839: "No client-side `ensureProfile()` calls needed")
// - Profile creation handled by PostgreSQL triggers (Line 826-843)
// - NO FALLBACK DATA (Line 239: "NEVER provide fallback values that hide errors")
// - Proper error handling with permanentLogger.captureError (Line 248)

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const timer = permanentLogger.timing('dashboard.layout.render')

  try {
    permanentLogger.breadcrumb('dashboard', 'Getting authenticated user', {
      timestamp: Date.now()
    })

    const user = await getUser()

    if (!user) {
      permanentLogger.info('DASHBOARD_LAYOUT', 'No authenticated user, redirecting to login')
      timer.stop()
      redirect('/login')
    }

    // ✅ CLAUDE.md Line 839: "No client-side `ensureProfile()` calls needed"
    // Profile is GUARANTEED to exist via database trigger `on_auth_user_created`
    // NO manual profile creation or checking needed
    // The PostgreSQL trigger handles:
    // - Profile creation on user signup
    // - Profile updates when auth metadata changes
    // - OAuth metadata extraction (name, avatar)
    // - Conflict resolution with upsert logic

    permanentLogger.breadcrumb('dashboard', 'User authenticated', {
      userId: user.id,
      email: user.email
    })

    timer.stop()

    return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex h-screen">
        <DashboardNav />

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Project Genie
              </h1>
              <UserMenu user={user} />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Enterprise notification system - only visible in dashboard */}
      <NotificationListV2
        position="bottom-left"
        maxHeight="400px"
        autoScroll={true}
        showTimestamp={true}
        showQueueStats={process.env.NODE_ENV === 'development'}
      />
    </div>
  )
  } catch (error) {
    // ✅ CLAUDE.md Line 248: "ALWAYS USE captureError FOR ERROR LOGGING"
    permanentLogger.captureError('DASHBOARD_LAYOUT', error as Error, {
      operation: 'render',
      context: 'authentication_check'
    })
    timer.stop()

    // NO FALLBACK - redirect on error (Line 239: "NEVER provide fallback values")
    redirect('/login')
  }
}