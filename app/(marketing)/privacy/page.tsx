import { Metadata } from 'next'
import { LandingNav } from '@/components/marketing/landing-nav'
import { LandingFooter } from '@/components/marketing/landing-footer'

export const metadata: Metadata = {
  title: 'Privacy Policy — OttoManagerPro',
  description: 'OttoManagerPro privacy policy. Learn how we collect, use, and protect your data.',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <h1 className="font-sora text-3xl sm:text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-10">Effective Date: February 15, 2026</p>

        <div className="space-y-8 text-foreground/90 leading-relaxed">
          <section>
            <h2 className="font-sora text-xl font-semibold text-foreground mb-3">1. Introduction</h2>
            <p>
              OttoManagerPro (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the OttoManagerPro platform
              at ottomanagerpro.com. This Privacy Policy explains how we collect, use, and protect information
              when you use our service. By using OttoManagerPro, you agree to the practices described here.
            </p>
          </section>

          <section>
            <h2 className="font-sora text-xl font-semibold text-foreground mb-3">2. Information We Collect</h2>
            <p className="mb-3">We collect the following categories of information to provide our services:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Contact Information:</strong> Customer names, phone numbers, and email addresses.</li>
              <li><strong>Vehicle Information:</strong> Make, model, year, mileage, and VIN.</li>
              <li><strong>Service Records:</strong> Service history, dates, and maintenance details.</li>
              <li><strong>Account Information:</strong> Shop name, business details, and login credentials (managed by Clerk).</li>
              <li><strong>SMS Consent Records:</strong> Opt-in/opt-out status and consent timestamps.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-sora text-xl font-semibold text-foreground mb-3">3. How We Use Your Information</h2>
            <p className="mb-3">We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Send automated service reminder SMS messages to customers who have opted in.</li>
              <li>Manage customer and vehicle records for auto repair shops.</li>
              <li>Track service history and maintenance schedules.</li>
              <li>Provide analytics and reporting to shop owners.</li>
              <li>Improve and maintain the OttoManagerPro platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-sora text-xl font-semibold text-foreground mb-3">4. SMS Messaging (ServicePing)</h2>
            <p>
              Our SMS reminder service, ServicePing, sends automated text messages to customers who have provided
              explicit consent. Messages include service reminders, appointment confirmations, and follow-ups.
              Message frequency varies. Customers can opt out at any time by replying <strong>STOP</strong> to
              any message. Standard message and data rates may apply. We use Twilio as our SMS delivery provider.
              Twilio processes phone numbers and message content solely to deliver messages on our behalf.
            </p>
          </section>

          <section>
            <h2 className="font-sora text-xl font-semibold text-foreground mb-3">5. Data Sharing</h2>
            <p>
              <strong>We do not sell, rent, or share your personal information with third parties for
              marketing purposes.</strong> We only share data with service providers that are necessary to
              operate the platform:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong>Twilio:</strong> SMS delivery.</li>
              <li><strong>Clerk:</strong> Authentication and user management.</li>
              <li><strong>Database hosting:</strong> Secure cloud infrastructure for data storage.</li>
            </ul>
            <p className="mt-3">
              These providers are contractually bound to protect your data and may only use it to perform
              services on our behalf.
            </p>
          </section>

          <section>
            <h2 className="font-sora text-xl font-semibold text-foreground mb-3">6. Cookies &amp; Tracking</h2>
            <p>
              We use essential cookies for authentication and session management. We do not use third-party
              advertising trackers or sell browsing data. Analytics, when used, are aggregated and anonymized.
            </p>
          </section>

          <section>
            <h2 className="font-sora text-xl font-semibold text-foreground mb-3">7. Data Retention</h2>
            <p>
              We retain customer and service data for as long as the shop&apos;s account is active. SMS consent
              records and message logs are retained for a minimum of 5 years for compliance purposes. When an
              account is deleted, associated data is permanently removed within 30 days.
            </p>
          </section>

          <section>
            <h2 className="font-sora text-xl font-semibold text-foreground mb-3">8. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Request access to the personal data we hold about you.</li>
              <li>Request correction of inaccurate information.</li>
              <li>Request deletion of your personal data.</li>
              <li>Opt out of SMS messages at any time by replying <strong>STOP</strong>.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:hello@ottomanagerpro.com" className="text-orange-500 hover:underline">
                hello@ottomanagerpro.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-sora text-xl font-semibold text-foreground mb-3">9. Data Security</h2>
            <p>
              We implement industry-standard security measures including encrypted data transmission (TLS),
              secure database storage, and role-based access controls. All data is scoped per-organization
              to ensure tenant isolation.
            </p>
          </section>

          <section>
            <h2 className="font-sora text-xl font-semibold text-foreground mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted on this page with
              an updated effective date. Continued use of the service after changes constitutes acceptance
              of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="font-sora text-xl font-semibold text-foreground mb-3">11. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, contact us at:{' '}
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
