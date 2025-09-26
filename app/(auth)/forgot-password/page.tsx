'use client'

import dynamic from 'next/dynamic'

// Dynamically import the actual forgot password page with SSR disabled
const ForgotPasswordPage = dynamic(
  () => import('./page-original'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading password reset...</p>
        </div>
      </div>
    )
  }
)

export default ForgotPasswordPage