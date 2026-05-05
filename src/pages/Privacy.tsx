import { Link } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';

const sections = [
  {
    number: '01',
    title: 'Information We Collect',
    subsections: [
      {
        heading: 'Account Information',
        body: 'When you create an account, we collect your name, email address, role (hirer, musician, or admin), and profile details you choose to add — location, instruments, genres, pricing model (hourly or flat fee), rates, and availability. Location helps match search and discovery.',
      },
      {
        heading: 'Usage Data',
        body: 'When you use Rhythm Guardian, we collect booking details, messages sent through the platform, reviews and ratings, search queries, in-app and push notifications (where enabled), reminder preferences, and basic technical data such as device type, IP address, browser information, and usage logs used for security and analytics. We may also record operational event identifiers in notification metadata to prevent duplicate administrative alerts.',
      },
      {
        heading: 'Payment Information',
        body: 'Payment details are handled securely by our payment processor (Paystack). We store transaction records, booking amounts, and payout information, but we do not store full card numbers or sensitive payment credentials.',
      },
      {
        heading: 'Communications',
        body: 'We collect messages sent through our platform messaging system, support tickets, and any other communications you have with us or other users through the platform.',
      },
      {
        heading: 'Map and Location Link Usage',
        body: 'When you open a map link from Rhythm Guardian (for example Google Maps search links for musician or event locations), that action is handled by the third-party map provider. Their processing of location and usage data is governed by their own privacy terms.',
      },
      {
        heading: 'Onboarding and product tours',
        body: 'We may store whether you have completed optional orientation or feature tours (for example a first-time dashboard walkthrough) in your account or in your browser’s local storage so we do not repeatedly show the same introduction. You can skip or dismiss these flows at any time.',
      },
      {
        heading: 'AI Assistant chat',
        body: 'When you use the AI Assistant in chat, we process your messages and limited context (such as role, booking counts, and confirmation states where needed) to generate replies or create support tickets if you escalate. Optional cloud-based language generation may process prompts according to our agreements with providers; avoid entering passwords or full card numbers.',
      },
    ],
  },
  {
    number: '02',
    title: 'How We Use Your Information',
    intro: 'We use your information to:',
    bullets: [
      'Create and manage your Rhythm Guardian account.',
      'Match hirers with suitable musicians and manage bookings.',
      'Process payments securely through our partner and align releases with booking confirmation and platform rules.',
      'Enable messaging, notifications, and other communication features.',
      'Send booking confirmations, payment receipts, service reminders, and post-service confirmation prompts where applicable.',
      'Monitor platform safety, prevent fraud, and enforce our Terms of Service.',
      'Resolve disputes between hirers and musicians.',
      'Improve the platform using aggregated, anonymised analytics.',
      'Comply with legal obligations and respond to lawful requests.',
    ],
  },
  {
    number: '03',
    title: 'Sharing of Information',
    subsections: [
      {
        heading: 'Between Users',
        body: 'Relevant profile and booking details are shared between hirers and musicians when a booking is created — including names, contact information (after booking confirmation), event details, and service requirements.',
      },
      {
        heading: 'Service Providers',
        body: 'We use third-party providers for payments (Paystack), cloud infrastructure (Supabase), analytics, and email delivery. These providers process data on our behalf under data protection agreements and are not permitted to use your data for their own purposes.',
      },
      {
        heading: 'Legal Requirements',
        body: 'We may share information in response to valid legal requests, court orders, or government inquiries, or to prevent fraud and protect the rights and safety of users.',
      },
      {
        heading: 'Business Transfers',
        body: 'In the event of a merger, acquisition, or sale of assets, your information may be transferred to the new owner, subject to this Privacy Policy.',
      },
    ],
  },
  {
    number: '04',
    title: 'Data Retention and Security',
    subsections: [
      {
        heading: 'Retention',
        body: 'We keep your account data, bookings, and messages for as long as your account is active or as needed to provide the service and comply with legal obligations. Financial records are retained for at least 7 years for tax and accounting purposes.',
      },
      {
        heading: 'Security Measures',
        body: 'Rhythm Guardian uses industry-standard technical and organisational measures to protect your information, including encryption in transit (HTTPS/TLS) and at rest, secure authentication and access controls, regular security monitoring, escrow protection for payments, and fraud detection systems.',
      },
    ],
  },
  {
    number: '05',
    title: 'Your Rights and Choices',
    intro: 'Depending on your location, you may have rights to:',
    bullets: [
      'Access the personal data we hold about you.',
      'Update or correct your profile information at any time through your account settings.',
      'Request deletion of your account and certain stored data (subject to legal retention requirements). Administrators process verified deletion workflows where applicable.',
      'Object to certain uses of your data, such as marketing communications.',
      'Export your data in a portable format.',
      'Withdraw consent for optional data processing.',
    ],
    footer: 'To exercise these rights or ask questions about this policy, contact the Rhythm Guardian support team through the platform or email us at support@rhythmguardian.com.',
  },
  {
    number: '06',
    title: 'Cookies, Local Storage, and Tracking',
    content: [
      'We use cookies and similar technologies to maintain your session, remember your preferences (such as theme), and analyse platform usage. The app may also use browser local storage for limited purposes — for example to remember that you completed an orientation tour, or to detect new application versions after we deploy updates. You can control cookies through your browser settings; clearing site data may reset some preferences.',
      'We use analytics tools to understand how users interact with the platform. This data is aggregated and anonymised where possible and helps us improve the user experience.',
    ],
  },
  {
    number: '07',
    title: "Children's Privacy",
    content: [
      'Rhythm Guardian is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If we become aware that a child has provided us with personal information, we will take steps to delete such information promptly.',
    ],
  },
  {
    number: '08',
    title: 'Assistant and automation limitations',
    content: [
      'The AI Assistant suggests steps for using Rhythm Guardian; it does not legally bind you or the platform. You must confirm bookings, payments, and service completion in the app.',
      'Where optional AI text generation is enabled, we constrain topics to platform support and safe use. You may receive scripted answers when automation is unavailable.',
    ],
  },
  {
    number: '09',
    title: 'Onboarding and Navigation Guidance Data',
    subsections: [
      {
        heading: 'What is stored',
        body: 'We may store onboarding progress (for example tour name, last step, completion flag) in your account (such as the feature_tours table) and/or browser local storage so we do not replay the same introduction every visit.',
      },
      {
        heading: 'Why this is processed',
        body: 'So hirers, musicians, and admins see role-relevant guidance — search and pricing behaviour, bookings, payments, confirmations, chat assistant entry points, and settings.',
      },
      {
        heading: 'Control and retention',
        body: 'You can skip or dismiss tours. Clearing site data may reset local flags. Operators may reset tours when flows materially change.',
      },
    ],
  },
  {
    number: '10',
    title: 'Updates to This Policy',
    content: [
      'We may update this Privacy Policy from time to time as we add new features or to comply with legal requirements. When we make material changes, we will update the version date and may notify you through the platform or by email. Your continued use of the platform after changes take effect means you accept the updated policy.',
    ],
  },
];

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-16 max-w-3xl">
          <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-6">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <span className="mx-2 opacity-40">/</span>
            Privacy Policy
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-xl">
            This policy explains how Rhythm Guardian collects, uses, and protects your information
            when you use our platform to hire musicians or offer musical services.
          </p>
          <p className="text-xs text-muted-foreground mt-6 font-medium">Last updated: 2 May 2026</p>
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
          This page is provided for informational purposes only and does not constitute legal advice.
          You should have a qualified legal professional review and adapt this policy for your specific
          needs and jurisdiction.
        </p>
      </div>
    </div>
  );
}
