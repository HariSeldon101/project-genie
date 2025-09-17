'use client'

import { registerLicense } from '@syncfusion/ej2-base'

// Register Syncfusion license immediately when this module loads
const licenseKey = process.env.NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY

if (licenseKey) {
  registerLicense(licenseKey)
  console.log('[Syncfusion] License registered from environment variable')
} else {
  console.error('[Syncfusion] No license key found in environment variables')
}

// Empty component - registration happens on import
export function SyncfusionInit() {
  return null
}