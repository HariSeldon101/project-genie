import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Navigation } from '@/components/navigation'
import { StarfieldBackground } from '@/components/starfield-background'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen relative">
      <StarfieldBackground />
      <Navigation />

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-4xl">
        <Card className="backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-white/20">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Privacy Policy</CardTitle>
            <CardDescription>Last updated: January 2025</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 prose dark:prose-invert">
            <section>
              <h2>1. Information We Collect</h2>
              <p>
                We collect information that you provide directly to us, including:
              </p>
              <ul>
                <li>Account information (name, email, password)</li>
                <li>Project data and documentation inputs</li>
                <li>Usage statistics and analytics</li>
                <li>Communication preferences</li>
              </ul>
            </section>

            <section>
              <h2>2. How We Use Your Information</h2>
              <p>
                We use the information we collect to:
              </p>
              <ul>
                <li>Provide, maintain, and improve our services</li>
                <li>Generate project documentation based on your inputs</li>
                <li>Send you technical notices and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Analyze usage patterns to enhance user experience</li>
              </ul>
            </section>

            <section>
              <h2>3. Data Storage and Security</h2>
              <p>
                Your data is stored securely using industry-standard encryption and security practices.
                We use Supabase for data storage, which provides:
              </p>
              <ul>
                <li>End-to-end encryption</li>
                <li>Regular security audits</li>
                <li>Compliance with data protection regulations</li>
                <li>Automated backups</li>
              </ul>
            </section>

            <section>
              <h2>4. AI and Machine Learning</h2>
              <p>
                We use AI models (including OpenAI GPT) to generate documentation. Your project data
                is processed to create customized documents. We do not use your data to train AI models
                unless you explicitly opt-in to research participation.
              </p>
            </section>

            <section>
              <h2>5. Data Sharing</h2>
              <p>
                We do not sell your personal information. We may share your information:
              </p>
              <ul>
                <li>With service providers who assist in operating our platform</li>
                <li>To comply with legal obligations</li>
                <li>To protect rights, property, and safety</li>
              </ul>
            </section>

            <section>
              <h2>6. Your Rights</h2>
              <p>
                You have the right to:
              </p>
              <ul>
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Export your project data</li>
                <li>Opt-out of marketing communications</li>
              </ul>
            </section>

            <section>
              <h2>7. Cookies and Tracking</h2>
              <p>
                We use cookies and similar tracking technologies to:
              </p>
              <ul>
                <li>Maintain your session and preferences</li>
                <li>Analyze site traffic and usage patterns</li>
                <li>Personalize your experience</li>
              </ul>
              <p>
                You can control cookies through your browser settings.
              </p>
            </section>

            <section>
              <h2>8. Data Retention</h2>
              <p>
                We retain your information for as long as your account is active or as needed to
                provide services. You may request deletion at any time through your account settings.
              </p>
            </section>

            <section>
              <h2>9. Children's Privacy</h2>
              <p>
                Our service is not intended for users under 18 years of age. We do not knowingly
                collect personal information from children.
              </p>
            </section>

            <section>
              <h2>10. Changes to Privacy Policy</h2>
              <p>
                We may update this privacy policy from time to time. We will notify you of significant
                changes via email or through the platform.
              </p>
            </section>

            <section>
              <h2>11. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy, please contact us through the platform
                support system or at the email provided in your account settings.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
