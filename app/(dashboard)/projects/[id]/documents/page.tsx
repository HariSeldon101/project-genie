'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function ProjectDocumentsRedirect() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  useEffect(() => {
    // Redirect to the main documents page with project filter
    router.push(`/documents?project=${projectId}`)
  }, [projectId, router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-muted-foreground">Redirecting to documents...</p>
      </div>
    </div>
  )
}