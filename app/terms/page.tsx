import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Navigation } from '@/components/navigation'
import { StarfieldBackground } from '@/components/starfield-background'

export default function TermsPage() {
  return (
    <div className="min-h-screen relative">
      <StarfieldBackground />
      <Navigation />

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-4xl">
        <Card className="backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-white/20">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Terms of Service</CardTitle>
            <CardDescription>Last updated: January 2025</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 prose dark:prose-invert">
            <section>
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing and using Project Genie, you accept and agree to be bound by the terms
                and provision of this agreement.
              </p>
            </section>

            <section>
              <h2>2. Use License</h2>
              <p>
                Permission is granted to temporarily use Project Genie for personal or commercial
                project documentation purposes. This is the grant of a license, not a transfer of title.
              </p>
            </section>

            <section>
              <h2>3. Service Description</h2>
              <p>
                Project Genie provides AI-powered project documentation generation services. We generate
                documents including but not limited to project charters, business cases, risk registers,
                and other project management artifacts.
              </p>
            </section>

            <section>
              <h2>4. User Responsibilities</h2>
              <ul>
                <li>Provide accurate information for document generation</li>
                <li>Review and validate all generated content before use</li>
                <li>Maintain confidentiality of account credentials</li>
                <li>Comply with applicable laws and regulations</li>
              </ul>
            </section>

            <section>
              <h2>5. Intellectual Property</h2>
              <p>
                Documents generated using Project Genie belong to you. We retain rights to the
                platform software and documentation templates. You may not reproduce, duplicate,
                copy, sell, or exploit any portion of the service without express written permission.
              </p>
            </section>

            <section>
              <h2>6. Disclaimer</h2>
              <p>
                Generated documents are provided as-is. While we strive for accuracy, users are
                responsible for reviewing and validating all content before use in production environments.
              </p>
            </section>

            <section>
              <h2>7. Limitations of Liability</h2>
              <p>
                Project Genie shall not be held liable for any damages arising from the use or inability
                to use the service, including but not limited to business decisions made based on
                generated documentation.
              </p>
            </section>

            <section>
              <h2>8. Modifications to Service</h2>
              <p>
                We reserve the right to modify or discontinue the service at any time without notice.
                We shall not be liable to you or any third party for any modification, suspension,
                or discontinuance of the service.
              </p>
            </section>

            <section>
              <h2>9. Governing Law</h2>
              <p>
                These terms shall be governed by and construed in accordance with applicable laws,
                without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2>10. Contact Information</h2>
              <p>
                For questions about these Terms of Service, please contact us through the platform
                support system.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
