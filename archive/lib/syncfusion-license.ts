/**
 * Syncfusion License Registration
 * This module must be imported before any Syncfusion components
 */
import { registerLicense } from '@syncfusion/ej2-base'

// Get license key - will be embedded at build time for client
const licenseKey = process.env.NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY

// Register license based on environment
function registerSyncfusionLicense() {
  if (!licenseKey) {
    console.warn('[Syncfusion] No license key found in NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY')
    return false
  }

  try {
    registerLicense(licenseKey)
    
    // Log based on environment
    if (typeof window !== 'undefined') {
      console.log('[Syncfusion] License registered successfully (client)')
      // Also log the first few characters to verify it's loaded
      console.log('[Syncfusion] License key loaded:', licenseKey.substring(0, 20) + '...')
    } else {
      console.log('[Syncfusion] License registered successfully (server)')
    }
    return true
  } catch (error) {
    console.error('[Syncfusion] Failed to register license:', error)
    return false
  }
}

// Register immediately
const registered = registerSyncfusionLicense()

// For client-side, also register on window load as a fallback
if (typeof window !== 'undefined' && !registered) {
  window.addEventListener('load', () => {
    console.log('[Syncfusion] Attempting client-side registration on window load')
    registerSyncfusionLicense()
  })
}

// Export registration status and function
export const syncfusionLicenseRegistered = registered
export { registerSyncfusionLicense }