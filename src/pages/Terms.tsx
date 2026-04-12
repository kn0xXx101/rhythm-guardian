import { Link } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';

const sections = [
  {
    number: '01',
    title: 'Your Relationship With Rhythm Guardian',
    content: [
      'By creating an account or using the platform, you agree to these Terms and any additional policies referenced here, including the Privacy Policy and booking or cancellation rules shown in the product.',
      'Rhythm Guardian provides an online marketplace for musical services. We do not employ musicians or guarantee any booking. Contracts are formed directly between hirers and musicians — the platform provides tools for discovery, communication, and secure payment processing.',
    ],
  },
  {
    number: '02',
    title: 'Accounts and Eligibility',
    bullets: [
      'You must be at least 18 years old to create an account.',
      'You are responsible for maintaining the confidentiality of your login details and for all activity under your account.',
      'You agree to provide accurate information and to keep your profile, availability, and contact details up to date.',
      'We may suspend or terminate accounts that violate these Terms, applicable law, or platform policies.',
    ],
  },
  {
    number: '03',
    title: 'Bookings, Payments, and Fees',
    subsections: [
      {
        heading: 'Escrow Protection',
        body: 'Payments are held securely in escrow until both parties confirm service completion. This protects hirers and musicians by ensuring payment is only released when the service is successfully rendered.',
      },
      {
        heading: 'Platform Fees',
        body: 'Rhythm Guardian charges a platform commission and payment processing fees (Paystack: 1.5% + ₵0.50) on each booking. These fees are clearly displayed before you confirm a booking and are deducted from the total amount before payout to musicians.',
      },
      {
        heading: 'Payment Processing',
        body: 'Payments and payouts are processed through Paystack. By using the platform, you authorise Rhythm Guardian and its payment partners to charge, hold, and disburse funds as required to complete bookings, refunds, and payouts.',
      },
      {
        heading: 'Cancellations and Refunds',
        body: 'Cancellation and refund outcomes are determined by the cancellation policy shown in the booking flow. Refund percentages typically decrease as the event date approaches. Both parties are responsible for reviewing these rules before confirming a booking.',
      },
    ],
  },
  {
    number: '04',
    title: 'Service Completion and Disputes',
    subsections: [
      {
        heading: 'Confirmation Process',
        body: 'After a service is rendered, the musician marks it as complete. The hirer must then confirm completion. Once both parties confirm, payment is automatically released from escrow to the musician.',
      },
      {
        heading: 'Dispute Resolution',
        body: 'If there is a disagreement about service completion or quality, either party can file a dispute through the platform. Disputes are reviewed by Rhythm Guardian administrators who will mediate and make a final decision based on evidence provided by both parties.',
      },
      {
        heading: 'Reviews and Ratings',
        body: 'After service completion, both parties can leave reviews and ratings. Reviews must be honest, relevant, and respectful. False or malicious reviews may be removed and can result in account suspension.',
      },
    ],
  },
  {
    number: '05',
    title: 'User Conduct and Content',
    intro: 'You agree not to:',
    bullets: [
      'Use the platform for any unlawful, harmful, or abusive purpose.',
      'Post or send content that is defamatory, hateful, or infringing.',
      'Circumvent fees, ratings, or safety features of the platform.',
      'Arrange payments outside the platform to avoid fees.',
      'Create fake accounts or manipulate reviews and ratings.',
      'Interfere with the operation or security of Rhythm Guardian.',
      'Share contact information before a booking is confirmed.',
    ],
    footer: 'Rhythm Guardian may remove content, pause bookings, or suspend accounts where necessary to protect users, comply with law, or enforce these Terms.',
  },
  {
    number: '06',
    title: 'Musician Verification and Requirements',
    content: [
      'Musicians must complete their profile with accurate information about their skills, experience, instruments, and availability. Musicians may be required to submit verification documents before receiving bookings or payouts.',
      'Musicians must provide valid payment details (bank account or mobile money) to receive payouts. Payouts are typically processed within 24–48 hours after service confirmation.',
      'Musicians are responsible for maintaining professional conduct, arriving on time, and delivering the agreed-upon service. Repeated cancellations or poor reviews may result in account restrictions.',
    ],
  },
  {
    number: '07',
    title: 'Disclaimers and Limitation of Liability',
    content: [
      'The platform is provided on an "as is" and "as available" basis. To the maximum extent permitted by law, Rhythm Guardian disclaims all warranties, express or implied, including fitness for a particular purpose and non-infringement.',
      'Rhythm Guardian is not responsible for the acts or omissions of hirers or musicians, including quality of performance, punctuality, equipment failures, venue issues, or personal disputes between parties.',
      'To the extent allowed by law, our total liability for any claim is limited to the amount of fees you paid to Rhythm Guardian for the booking most closely related to that claim.',
    ],
  },
  {
    number: '08',
    title: 'Changes to These Terms',
    content: [
      'We may update these Terms from time to time. When we make material changes, we will update the version date and may notify you through the app or by email. Your continued use of Rhythm Guardian after changes take effect means you accept the updated Terms.',
    ],
  },
];

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-16 max-w-3xl">
          <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-6">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <span className="mx-2 opacity-40">/</span>
            Terms of Service
          </p>
          <h1 className="text-4xl font-bold tracking-tight mb-4">Terms of Service</h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-xl">
            These terms govern your use of Rhythm Guardian as a hirer, musician, or administrator.
            Please read them carefully before using the platform.
          </p>
          <p className="text-xs text-muted-foreground mt-6 font-medium">Last updated: April 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <div className="space-y-16">
          {sections.map((section) => (
            <div key={section.number} className="group">
              <div className="flex items-start gap-6">
                <span className="text-xs font-mono text-muted-foreground/50 mt-1 shrink-0 w-6">
                  {section.number}
                </span>
                <div className="flex-1 space-y-4">
                  <h2 className="text-xl font-semibold tracking-tight">{section.title}</h2>

                  {section.intro && (
                    <p className="text-muted-foreground text-sm leading-relaxed">{section.intro}</p>
                  )}

                  {section.content?.map((p, i) => (
                    <p key={i} className="text-muted-foreground text-sm leading-relaxed">{p}</p>
                  ))}

                  {section.bullets && (
                    <ul className="space-y-2">
                      {section.bullets.map((b, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/50 shrink-0" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.footer && (
                    <p className="text-muted-foreground text-sm leading-relaxed">{section.footer}</p>
                  )}

                  {section.subsections?.map((sub, i) => (
                    <div key={i} className="pl-4 border-l-2 border-border space-y-1.5">
                      <p className="text-sm font-semibold">{sub.heading}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{sub.body}</p>
                    </div>
                  ))}
                </div>
              </div>
              <Separator className="mt-16 opacity-50" />
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground/60 mt-12 leading-relaxed border-t pt-8">
          This page is provided as a general template and does not replace independent legal advice.
          You should consult a qualified legal professional to validate and adapt these Terms for your
          specific business and jurisdiction.
        </p>
      </div>
    </div>
  );
}
