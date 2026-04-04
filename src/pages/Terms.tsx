import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <p className="text-sm text-muted-foreground mb-2">
            <Link to="/" className="hover:underline">
              Home
            </Link>{' '}
            / Terms of Service
          </p>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Terms of Service</h1>
          <p className="text-muted-foreground">
            Last Updated: March 2026
          </p>
          <p className="text-muted-foreground mt-2">
            These Terms of Service govern your use of the Rhythm Guardian platform as a hirer,
            musician, or administrator.
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Your Relationship With Rhythm Guardian</CardTitle>
              <CardDescription>
                Rhythm Guardian provides an online marketplace for musical services.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                By creating an account or using the platform, you agree to these Terms and any
                additional policies referenced here, including the Privacy Policy and booking or
                cancellation rules shown in the product.
              </p>
              <p>
                Rhythm Guardian does not employ musicians or guarantee any booking. Contracts are
                formed directly between hirers and musicians, and the platform provides tools for
                discovery, communication, and secure payment processing.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Accounts and Eligibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <ul className="list-disc list-inside space-y-1">
                <li>You must be at least 18 years old to create an account.</li>
                <li>
                  You are responsible for maintaining the confidentiality of your login details and
                  for all activity under your account.
                </li>
                <li>
                  You agree to provide accurate information and to keep your profile, availability,
                  and contact details up to date.
                </li>
                <li>
                  We may suspend or terminate accounts that violate these Terms, applicable law, or
                  platform policies.
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Bookings, Payments, and Fees</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                When a hirer confirms a booking with a musician, both parties agree to the details
                shown in the booking summary, including date, time, location, price, and any
                special terms.
              </p>
              <div>
                <p className="font-semibold text-foreground">Escrow Protection:</p>
                <p>
                  Payments are held securely in escrow until both parties confirm service completion. This protects both hirers and musicians by ensuring payment is only released when the service is successfully rendered.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Platform Fees:</p>
                <p>
                  Rhythm Guardian charges a platform commission (typically 15%) and payment processing fees (Paystack: 1.5% + ₵0.50) on each booking. These fees are clearly displayed in the fee calculator and are deducted from the total booking amount before payout to musicians.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Payment Processing:</p>
                <p>
                  Payments and payouts are processed through integrated payment providers (Paystack). By using
                  the platform, you authorize Rhythm Guardian and its payment partners to charge,
                  hold, and disburse funds as required to complete bookings, refunds, and payouts.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Cancellations and Refunds:</p>
                <p>
                  Cancellation and refund outcomes are determined by the cancellation policy
                  shown in the booking flow. Refund percentages typically decrease as the event date approaches. Both hirers and musicians
                  are responsible for reviewing these rules before confirming a booking.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Service Completion and Disputes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <div>
                <p className="font-semibold text-foreground">Confirmation Process:</p>
                <p>
                  After a service is rendered, the musician marks the service as complete. The hirer must then confirm completion. Once both parties confirm, payment is automatically released from escrow to the musician within 24-48 hours.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Dispute Resolution:</p>
                <p>
                  If there is a disagreement about service completion or quality, either party can file a dispute through the platform. Disputes are reviewed by Rhythm Guardian administrators who will mediate and make a final decision based on evidence provided by both parties.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Reviews and Ratings:</p>
                <p>
                  After service completion, both parties can leave reviews and ratings. Reviews must be honest, relevant, and respectful. False or malicious reviews may be removed and can result in account suspension.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. User Conduct and Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>You agree not to:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Use the platform for any unlawful, harmful, or abusive purpose.</li>
                <li>Post or send content that is defamatory, hateful, or infringing.</li>
                <li>Circumvent fees, ratings, or safety features of the platform.</li>
                <li>Arrange payments outside the platform to avoid fees.</li>
                <li>Create fake accounts or manipulate reviews and ratings.</li>
                <li>Interfere with the operation or security of Rhythm Guardian.</li>
                <li>Share contact information before a booking is confirmed (to prevent fee circumvention).</li>
              </ul>
              <p>
                Rhythm Guardian may remove content, pause bookings, suspend or ban accounts where
                necessary to protect users, comply with law, or enforce these Terms.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Musician Verification and Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                Musicians must complete their profile with accurate information about their skills, experience, instruments, and availability. Musicians may be required to submit verification documents before receiving bookings or payouts.
              </p>
              <p>
                Musicians must provide valid payment details (bank account or mobile money) to receive payouts. Payouts are typically processed within 24-48 hours after service confirmation.
              </p>
              <p>
                Musicians are responsible for maintaining professional conduct, arriving on time, and delivering the agreed-upon service. Repeated cancellations or poor reviews may result in account restrictions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Disclaimers and Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                The platform is provided on an "as is" and "as available" basis. To the maximum
                extent permitted by law, Rhythm Guardian disclaims all warranties, express or
                implied, including fitness for a particular purpose and non-infringement.
              </p>
              <p>
                Rhythm Guardian is not responsible for the acts or omissions of hirers or musicians, including but not limited to: quality of musical performance, punctuality, equipment failures, venue issues, or personal disputes between parties.
              </p>
              <p>
                To the extent allowed by law, our total liability for any claim arising out of or
                relating to the platform is limited to the amount of fees you paid to Rhythm
                Guardian for the booking or service most closely related to that claim.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Changes to These Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                We may update these Terms from time to time. When we make material changes, we will
                update the version in the admin platform policies settings and may notify you
                through the app or by email. Your continued use of Rhythm Guardian after changes
                take effect means you accept the updated Terms.
              </p>
              <p className="text-xs pt-4 border-t">
                This page is provided as a general template and does not replace independent legal
                advice. You should consult a qualified legal professional to validate and adapt
                these Terms for your specific business and jurisdiction.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
