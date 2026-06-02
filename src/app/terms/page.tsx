"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Brain, ArrowLeft, MessageSquare, Mail, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useTranslation } from "@/lib/i18n/use-translation"
import { LanguageToggle } from "@/components/language-toggle"
import { ContactBar } from "@/components/contact-bar"
import { CONTACT_INFO } from "@/lib/contact-info"

export default function TermsPage() {
  const { t, lang } = useTranslation()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4 mr-1" /> {t("back.home")}
            </Link>
            <div className="flex items-center gap-3">
              <a href={`https://wa.me/${CONTACT_INFO.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-emerald-500 transition-colors flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                <span className="hidden sm:inline">{t("contact.phone")}</span>
              </a>
              <a href={`mailto:${CONTACT_INFO.email}`} className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                <Mail className="h-3 w-3" />
                <span className="hidden sm:inline">{CONTACT_INFO.email}</span>
              </a>
              <LanguageToggle variant="header" />
            </div>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Terms & Conditions</h1>
              <p className="text-sm text-muted-foreground">Mapato / sokogateOS</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Last updated: June 1, 2026</p>
        </div>

        <Separator className="mb-8" />

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              By accessing or using Mapato ("the Platform"), you agree to be bound by these Terms & Conditions 
              ("Terms"). If you do not agree to these Terms, you may not access or use the Platform.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              These Terms constitute a legally binding agreement between you ("User," "Client," or "You") and 
              Mapato ("Company," "We," "Us," or "Our"). The Platform includes all associated services, 
              APIs, integrations, and content made available through mapato.app and related domains.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Mapato provides an AI-powered business automation platform (sokogateOS) that enables B2B trading 
              companies to automate lead qualification, client onboarding, follow-up communications, and 
              trade operations through various channels including but not limited to WhatsApp, email, and web.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              The Platform integrates with third-party services including WATI.io, QMe, Make.com, Voiceflow, 
              Instantly.ai, and Sokogate. Your use of these third-party services is subject to their respective 
              terms and conditions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">3. User Registration & Accounts</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              3.1. You must register for an account to access the Platform. You agree to provide accurate, 
              current, and complete information during the registration process.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              3.2. You are responsible for maintaining the confidentiality of your account credentials and 
              for all activities that occur under your account.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              3.3. You must be at least 18 years of age to use the Platform. By registering, you represent 
              and warrant that you meet this requirement.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              3.4. The Company reserves the right to suspend or terminate accounts that violate these Terms 
              or engage in fraudulent, abusive, or illegal activities.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">4. Subscription & Pricing</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              4.1. <strong>Subscription Fee:</strong> The Platform is offered on a subscription basis with 
              monthly fees as outlined on the pricing page. Fees are billed in advance on a monthly basis 
              unless otherwise agreed in writing.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              4.2. <strong>Success Fee:</strong> In addition to the subscription fee, the Company charges a 
              success-based fee ("Success Fee") calculated as a percentage of revenue generated by the User 
              through the Platform. The Success Fee percentage varies by plan tier as specified on the pricing page.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              4.3. The Success Fee is calculated monthly based on the gross revenue directly attributable to 
              leads generated, deals closed, or revenue collected through the Platform's automation features.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              4.4. All fees are exclusive of applicable taxes. Users are responsible for any taxes, duties, 
              or levies imposed by any taxing authority.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              4.5. Late payments may incur a 1.5% monthly interest charge on outstanding balances.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">5. WhatsApp & Communication Compliance</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              5.1. Users must comply with WhatsApp's Business Messaging Policy, including but not limited to 
              obtaining opt-in consent from contacts before sending messages.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              5.2. Users must maintain accurate records of consent for all WhatsApp communications initiated 
              through the Platform.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              5.3. The Company reserves the right to suspend WhatsApp messaging services if the User violates 
              WhatsApp's terms of service or applicable anti-spam regulations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">6. Data Privacy & Security</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              6.1. The Company processes personal data in accordance with our Privacy Policy and applicable 
              data protection laws, including the Kenya Data Protection Act (2019).
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              6.2. Users represent and warrant that they have obtained all necessary consents and authorizations 
              to process personal data of their clients, leads, and contacts through the Platform.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              6.3. The Company implements reasonable security measures to protect data, but cannot guarantee 
              absolute security. Users are responsible for maintaining their own security practices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">7. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              7.1. The Platform, including its software, design, brand, and content, is owned by the Company 
              and protected by intellectual property laws.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              7.2. Users retain ownership of their data and content uploaded to the Platform. Users grant 
              the Company a license to process this data solely for the purpose of providing the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">8. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              8.1. The Platform is provided "as is" and "as available" without warranties of any kind, 
              either express or implied.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              8.2. The Company shall not be liable for any indirect, incidental, special, consequential, 
              or punitive damages, including but not limited to loss of profits, data, or business opportunities.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              8.3. The Company's total liability for any claims arising under these Terms shall not exceed 
              the total fees paid by the User in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">9. Termination</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              9.1. Either party may terminate this agreement with 30 days' written notice.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              9.2. The Company may terminate immediately if the User breaches these Terms or engages in 
              conduct that could harm the Platform or other users.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              9.3. Upon termination, the User's access to the Platform will be revoked. The Company will 
              provide a reasonable period for data export upon request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">10. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              The Company reserves the right to modify these Terms at any time. Users will be notified of 
              material changes via email or in-app notification. Continued use of the Platform after changes 
              constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">11. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              These Terms shall be governed by and construed in accordance with the laws of the Republic of 
              Kenya. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction 
              of the courts of Nairobi, Kenya.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">12. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              For questions about these Terms, please contact us at:
            </p>
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <p className="text-sm">
                <strong>{t("contact.phone")}:</strong>{" "}
                <a href={`tel:${CONTACT_INFO.phone}`} className="text-primary hover:underline">{CONTACT_INFO.phone}</a>
              </p>
              <p className="text-sm">
                <strong>{t("contact.email")}:</strong>{" "}
                <a href={`mailto:${CONTACT_INFO.email}`} className="text-primary hover:underline">{CONTACT_INFO.email}</a>
              </p>
              <p className="text-sm"><strong>{t("contact.address")}:</strong> Nairobi, Kenya</p>
            </div>
          </section>
        </div>

        <div className="mt-12 flex items-center justify-between">
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
            </Button>
          </Link>
          <Link href="/signup">
            <Button>
              I Agree — Create Account <Brain className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
      <ContactBar />
    </div>
  )
}
