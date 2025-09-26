'use client'

// ULTRA-NUCLEAR: This file forces client-side rendering for the entire app
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const fetchCache = 'force-no-store'
export const revalidate = 0
export const preferredRegion = 'auto'

export default function ForceClient() {
  return null
}