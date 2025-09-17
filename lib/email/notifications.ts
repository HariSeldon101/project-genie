import { Resend } from 'resend'

// Initialize Resend with API key - lazy initialization to avoid build-time errors
let resend: Resend | null = null

const getResendClient = () => {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

// Admin email address to receive notifications
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'stusandboxacc@gmail.com'
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'notifications@project-genie.com'

export interface UserEventData {
  email: string
  name?: string
  userId: string
  timestamp: string
  eventType: 'signup' | 'login'
  metadata?: Record<string, any>
}

/**
 * Send email notification to admin when a user signs up
 */
export async function sendSignupNotification(userData: UserEventData) {
  try {
    const client = getResendClient()
    if (!client) {
      console.log('Resend client not initialized - skipping email notification')
      return { success: false, error: 'Email service not configured' }
    }
    
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `🎉 New User Signup: ${userData.email}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New User Registration</h2>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>Email:</strong> ${userData.email}</p>
            ${userData.name ? `<p style="margin: 10px 0;"><strong>Name:</strong> ${userData.name}</p>` : ''}
            <p style="margin: 10px 0;"><strong>User ID:</strong> ${userData.userId}</p>
            <p style="margin: 10px 0;"><strong>Signed up at:</strong> ${new Date(userData.timestamp).toLocaleString()}</p>
          </div>
          
          ${userData.metadata ? `
          <div style="margin-top: 20px;">
            <h3 style="color: #555;">Additional Information</h3>
            <pre style="background: #f9f9f9; padding: 10px; border-radius: 4px; overflow-x: auto;">
${JSON.stringify(userData.metadata, null, 2)}
            </pre>
          </div>
          ` : ''}
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #888; font-size: 12px;">
            This is an automated notification from Project Genie. 
            You're receiving this because you're listed as an admin.
          </p>
        </div>
      `,
      text: `
New User Registration

Email: ${userData.email}
${userData.name ? `Name: ${userData.name}` : ''}
User ID: ${userData.userId}
Signed up at: ${new Date(userData.timestamp).toLocaleString()}

${userData.metadata ? `Additional Information:\n${JSON.stringify(userData.metadata, null, 2)}` : ''}

---
This is an automated notification from Project Genie.
      `
    })

    if (error) {
      console.error('[Email] Failed to send signup notification:', error)
      throw error
    }

    console.log('[Email] Signup notification sent successfully:', data)
    return { success: true, data }
  } catch (error) {
    console.error('[Email] Error sending signup notification:', error)
    // Don't throw - we don't want email failures to break signup flow
    return { success: false, error }
  }
}

/**
 * Send email notification to admin when a user logs in
 */
export async function sendLoginNotification(userData: UserEventData) {
  try {
    const client = getResendClient()
    if (!client) {
      console.log('Resend client not initialized - skipping email notification')
      return { success: false, error: 'Email service not configured' }
    }
    
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `🔑 User Login: ${userData.email}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">User Login Activity</h2>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>Email:</strong> ${userData.email}</p>
            ${userData.name ? `<p style="margin: 10px 0;"><strong>Name:</strong> ${userData.name}</p>` : ''}
            <p style="margin: 10px 0;"><strong>User ID:</strong> ${userData.userId}</p>
            <p style="margin: 10px 0;"><strong>Login time:</strong> ${new Date(userData.timestamp).toLocaleString()}</p>
          </div>
          
          ${userData.metadata ? `
          <div style="margin-top: 20px;">
            <h3 style="color: #555;">Session Information</h3>
            <pre style="background: #f9f9f9; padding: 10px; border-radius: 4px; overflow-x: auto;">
${JSON.stringify(userData.metadata, null, 2)}
            </pre>
          </div>
          ` : ''}
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #888; font-size: 12px;">
            This is an automated notification from Project Genie. 
            You're receiving this because you're listed as an admin.
          </p>
        </div>
      `,
      text: `
User Login Activity

Email: ${userData.email}
${userData.name ? `Name: ${userData.name}` : ''}
User ID: ${userData.userId}
Login time: ${new Date(userData.timestamp).toLocaleString()}

${userData.metadata ? `Session Information:\n${JSON.stringify(userData.metadata, null, 2)}` : ''}

---
This is an automated notification from Project Genie.
      `
    })

    if (error) {
      console.error('[Email] Failed to send login notification:', error)
      throw error
    }

    console.log('[Email] Login notification sent successfully:', data)
    return { success: true, data }
  } catch (error) {
    console.error('[Email] Error sending login notification:', error)
    // Don't throw - we don't want email failures to break login flow
    return { success: false, error }
  }
}

/**
 * Send a combined daily summary of user activity
 */
export async function sendDailySummary(signups: UserEventData[], logins: UserEventData[]) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `📊 Daily Activity Summary - ${new Date().toLocaleDateString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Daily Activity Summary</h2>
          <p style="color: #666;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          
          <div style="display: flex; gap: 20px; margin: 30px 0;">
            <div style="flex: 1; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px;">
              <h3 style="margin: 0; font-size: 36px;">${signups.length}</h3>
              <p style="margin: 5px 0 0 0;">New Signups</p>
            </div>
            <div style="flex: 1; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 8px;">
              <h3 style="margin: 0; font-size: 36px;">${logins.length}</h3>
              <p style="margin: 5px 0 0 0;">User Logins</p>
            </div>
          </div>
          
          ${signups.length > 0 ? `
          <div style="margin-top: 30px;">
            <h3 style="color: #555;">New Users</h3>
            <ul style="list-style: none; padding: 0;">
              ${signups.map(u => `
                <li style="background: #f9f9f9; padding: 10px; margin: 5px 0; border-radius: 4px;">
                  ${u.email} - ${new Date(u.timestamp).toLocaleTimeString()}
                </li>
              `).join('')}
            </ul>
          </div>
          ` : ''}
          
          ${logins.length > 0 ? `
          <div style="margin-top: 30px;">
            <h3 style="color: #555;">Login Activity</h3>
            <ul style="list-style: none; padding: 0;">
              ${logins.slice(0, 10).map(u => `
                <li style="background: #f9f9f9; padding: 10px; margin: 5px 0; border-radius: 4px;">
                  ${u.email} - ${new Date(u.timestamp).toLocaleTimeString()}
                </li>
              `).join('')}
              ${logins.length > 10 ? `<li style="color: #888; padding: 10px;">... and ${logins.length - 10} more</li>` : ''}
            </ul>
          </div>
          ` : ''}
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #888; font-size: 12px;">
            This is an automated daily summary from Project Genie.
          </p>
        </div>
      `,
      text: `
Daily Activity Summary - ${new Date().toLocaleDateString()}

New Signups: ${signups.length}
User Logins: ${logins.length}

${signups.length > 0 ? `New Users:\n${signups.map(u => `- ${u.email} at ${new Date(u.timestamp).toLocaleTimeString()}`).join('\n')}` : ''}

${logins.length > 0 ? `Login Activity:\n${logins.slice(0, 10).map(u => `- ${u.email} at ${new Date(u.timestamp).toLocaleTimeString()}`).join('\n')}${logins.length > 10 ? `\n... and ${logins.length - 10} more` : ''}` : ''}

---
This is an automated daily summary from Project Genie.
      `
    })

    if (error) {
      console.error('[Email] Failed to send daily summary:', error)
      throw error
    }

    console.log('[Email] Daily summary sent successfully:', data)
    return { success: true, data }
  } catch (error) {
    console.error('[Email] Error sending daily summary:', error)
    return { success: false, error }
  }
}