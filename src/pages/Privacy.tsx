import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <p className="text-sm text-muted-foreground mb-2">
            <Link to="/" className="hover:underline">
              Home
            </Link>{' '}
            / Privacy Policy
          </p>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground">
            Last Updated: March 2026
          </p>
          <p className="text-muted-foreground mt-2">
            This Privacy Policy explains how Rhythm Guardian collects, uses, and protects your
            information when you use our platform to hire musicians or offer musical services.
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Information We Collect</CardTitle>
              <CardDescription>
                We only collect information needed to run the marketplace and keep users safe.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <div>
                <p className="font-semibold text-foreground">Account Information:</p>
                <p>
                  When you create an account, we collect basic profile information such as your name,
                  email address, password, role (hirer, musician, or admin), and any details you add
                  to your profile like location, instruments, genres, rates, and availability.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Usage Data:</p>
                <p>
                  When you use Rhythm Guardian, we collect booking details, messages sent
                  through the platform, reviews and ratings, search queries, and basic technical data such as device type, IP address, browser information, and usage logs used for security and analytics.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Payment Information:</p>
                <p>
                  Payment details are handled securely by our payment processor (Paystack). We store transaction records, booking amounts, and payout information, but we do not store full credit card numbers or sensitive payment credentials.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Communications:</p>
                <p>
                  We collect messages sent through our platform messaging system, support tickets, and any other communications you have with us or other users through the platform.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>We use your information to:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Create and manage your Rhythm Guardian account.</li>
                <li>Match hirers with suitable musicians and manage bookings.</li>
                <li>Process payments securely through escrow and release funds after service confirmation.</li>
                <li>Enable messaging, notifications, and other communication features.</li>
                <li>Send booking confirmations, payment receipts, and service reminders.</li>
                <li>Monitor platform safety, prevent fraud, and enforce our Terms of Service.</li>
                <li>Resolve disputes between hirers and musicians.</li>
                <li>Improve the platform using aggregated, anonymized analytics.</li>
                <li>Comply with legal obligations and respond to lawful requests.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Sharing of Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                We share your information only when necessary to provide the service or when we are
                legally required to do so. Examples include:
              </p>
              <div>
                <p className="font-semibold text-foreground">Between Users:</p>
                <p>
                  Sharing relevant profile and booking details between hirers and musicians when a
                  booking is created. This includes names, contact information (after booking confirmation), event details, and service requirements.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Service Providers:</p>
                <p>
                  Using third-party providers for payments (Paystack), cloud infrastructure (Supabase), analytics, and email
                  delivery. These providers process data on our behalf under data protection
                  agreements and are not permitted to use your data for their own purposes.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Legal Requirements:</p>
                <p>
                  Responding to valid legal requests, court orders, or government inquiries. We may also share information to prevent fraud, protect the rights and
                  safety of users, or enforce our Terms of Service.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Business Transfers:</p>
                <p>
                  In the event of a merger, acquisition, or sale of assets, your information may be transferred to the new owner, subject to this Privacy Policy.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Data Retention and Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <div>
                <p className="font-semibold text-foreground">Retention:</p>
                <p>
                  We keep your account data, bookings, and messages for as long as your account is
                  active or as needed to provide the service and comply with legal obligations. Financial records are retained for at least 7 years for tax and accounting purposes. Some
                  data may be retained in backups for a limited period.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Security Measures:</p>
                <p>
                  Rhythm Guardian uses industry-standard technical and organizational measures to
                  protect your information, including:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Encryption in transit (HTTPS/TLS) and at rest</li>
                  <li>Secure authentication and access controls</li>
                  <li>Regular security monitoring and audits</li>
                  <li>Escrow protection for payments</li>
                  <li>Fraud detection and prevention systems</li>
                </ul>
                <p className="mt-2">
                  No system can be completely secure, so we also encourage you to use a
                  strong password and keep your login details secret.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Your Rights and Choices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>Depending on your location, you may have rights to:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Access the personal data we hold about you.</li>
                <li>Update or correct your profile information at any time through your account settings.</li>
                <li>Request deletion of your account and certain stored data (subject to legal retention requirements).</li>
                <li>Object to certain uses of your data, such as marketing communications.</li>
                <li>Export your data in a portable format.</li>
                <li>Withdraw consent for optional data processing.</li>
              </ul>
              <p className="mt-3">
                To exercise these rights or ask questions about this policy, contact the Rhythm
                Guardian support team through the platform or email us at support@rhythmguardian.com.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Cookies and Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                We use cookies and similar technologies to maintain your session, remember your preferences, and analyze platform usage. You can control cookies through your browser settings, but disabling them may affect platform functionality.
              </p>
              <p>
                We use analytics tools to understand how users interact with the platform. This data is aggregated and anonymized and helps us improve the user experience.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Children's Privacy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                Rhythm Guardian is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If we become aware that a child has provided us with personal information, we will take steps to delete such information.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Updates to This Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                We may update this Privacy Policy from time to time as we add new features or to
                comply with legal requirements. When we make material changes, we will update the
                version information and may notify you through the platform or by email. Your continued use of the platform after changes take effect means you accept the updated policy.
              </p>
              <p className="text-xs pt-4 border-t">
                This page is provided for informational purposes only and does not constitute legal
                advice. You should have a qualified legal professional review and adapt this policy
                for your specific needs and jurisdiction.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
