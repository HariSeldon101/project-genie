/**
 * Syncfusion Community License Configuration
 * 
 * Syncfusion offers a free Community License for companies and individuals 
 * with less than $1 million USD in annual gross revenue and 5 or fewer developers.
 * 
 * To get your free license:
 * 1. Visit: https://www.syncfusion.com/products/communitylicense
 * 2. Sign up for a free account
 * 3. Get your license key from the dashboard
 * 4. Add it to your .env.local file as NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY
 */

import { registerLicense } from '@syncfusion/ej2-base'

export function initializeSyncfusionLicense() {
  const licenseKey = process.env.NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY
  
  if (licenseKey) {
    // Register the license key
    registerLicense(licenseKey)
    console.log('Syncfusion license registered successfully')
  } else {
    console.warn(
      'No Syncfusion license key found. The components will work in trial mode with a watermark.',
      'To remove the watermark, get your free Community License at:',
      'https://www.syncfusion.com/products/communitylicense'
    )
  }
}

// Note: The Community License is completely free and includes:
// - All Syncfusion components
// - No watermarks
// - Commercial use allowed
// - No time limit
// - Community support

// Requirements for Community License:
// - Less than $1 million USD in annual gross revenue
// - 5 or fewer developers
// - Not available for subsidiaries of companies with revenue above $1 million

export default initializeSyncfusionLicense