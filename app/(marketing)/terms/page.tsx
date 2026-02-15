import { Metadata } from 'next'
import { LandingNav } from '@/components/marketing/landing-nav'
import { LandingFooter } from '@/components/marketing/landing-footer'

export const metadata: Metadata = {
  title: 'Terms of Service — OttoManagerPro',
  description: 'OttoManagerPro terms of service. Read our terms and conditions for using the platform.',
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <h1 className="font-sora text-3xl sm:text-4xl font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-10">Effective Date: February 15, 2026</p>

        <div className="space-y-8 text-foreground/90 leading-relaxed">
          <section>
            <h2 className="font-sora text-xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using OttoManagerPro (&quot;the Service&quot;), operated at ottomanagerpro.com,
              you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="font-sora text-xl font-semibold text-foreground mb-3">2. Service Description</h2>
            <p>
              OttoManagerPro is a multi-tenant SaaS CRM platform for auto repair shops. The Service provides
              customer and vehicle management, service record tracking, automated SMS reminders, and business
              analytics. Features may be added, modified, or removed at our discretion.
            </p>
          </section>

          <section>
            <h2 className="font-sora text-xl font-semibold text-foreground mb-3">3. Accounts</h2>
            <p>
              You are responsible for maintaining the security of your account credentials and for all activity
              that occurs under your account. You must provide accurate and complete information when creating
              an account. You must notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="font-sora text-xl font-semibold text-foreground mb-3">4. SMS Messaging Program (ServicePing)</h2>
            <p className="mb-3">
              OttoManagerPro includes an SMS messaging program called <strong>ServicePing</strong> that sends
              automated service reminders and follow-up messages to your customers.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must obtain explicit consent from each customer before enrolling them in SMS messaging.</li>
              <li>Message frequency varies based on service schedules and reminder rules you configure.</li>
              <li>Message and data rates may apply to recipients.</li>
              <li>Recipients may opt out at any time by replying <strong>STOP</strong> to any message.</li>
              <li>Recipients may reply <strong>HELP</strong> for assistance.</li>
              <li>You are responsible for ensuring your use of SMS messaging complies with all applicable laws,
                including the Telephone Consumer Protection Act (TCPA) and carrier guidelines.</li>
            </ul>
            <p className="mt-3">
              For SMS support, contact us at{' '}
              <a href="mailto:hello@ottomanagerpro.com" className="text-orange-500 hover:underline">
                hello@ottomanagerpro.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-sora text-xl font-semibold text-foreground mb-3">5. Acceptable Use</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Service to send unsolicited or spam messages.</li>
              <li>Upload false, misleading, or harmful content.</li>
              <li>Attempt to access another organization&apos;s data.</li>
              <li>Reverse-engineer, decompile, or disassemble any part of the Service.</li>
              <li>Use the Service in any way that violates applicable laws or regulations.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-sora text-xl font-semibold text-foreground mb-3">6. Intellectual Property</h2>
            <p>
              All content, features, and functionality of OttoManagerPro (including software, text, graphics,
              and logos) are owned by us and protected by intellectual property laws. You retain ownership of
              the data you upload to the Service.
            </p>
          </section>

          <section>
            <h2 className="font-sora text-xl font-semibold text-foreground mb-3">7. Disclaimers</h2>
            <p>
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any
              kind, either express or implied. We do not guarantee that the Service will be uninterrupted,
              error-free, or secure. SMS message delivery depends on third-party carriers and is not guaranteed.
            </p>
          </section>

          <section>
            <h2 className="font-sora text-xl font-semibold text-foreground mb-3">8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, OttoManagerPro shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages, including loss of profits, data,
              or business opportunities, arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="font-sora text-xl font-semibold text-foreground mb-3">9. Termination</h2>
            <p>
              We may suspend or terminate your access to the Service at any time for violation of these Terms
              or for any other reason at our discretion. Upon termination, your right to use the Service ceases
              immediately. Data associated with terminated accounts is deleted within 30 days.
            </p>
          </section>

          <section>
            <h2 className="font-sora text-xl font-semibold text-foreground mb-3">10. Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of the State of Texas,
              without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="font-sora text-xl font-semibold text-foreground mb-3">11. Changes to These Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. Changes will be posted on this page
              with an updated effective date. Continued use of the Service after changes constitutes
              acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="font-sora text-xl font-semibold text-foreground mb-3">12. Contact Us</h2>
            <p>
              If you have questions about these Terms of Service, contact us at:{' '}
              <a href="mailto:hello@ottomanagerpro.com" className="text-orange-500 hover:underline">
                hello@ottomanagerpro.com
              </a>
            </p>
          </section>
        </div>
      </main>
      <LandingFooter />
    </div>
  )
}
