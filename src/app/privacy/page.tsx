"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Brain, ArrowLeft, Shield, MessageSquare, Mail, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from "@/lib/i18n/use-translation"
import { LanguageToggle } from "@/components/language-toggle"
import { ContactBar } from "@/components/contact-bar"
import { CONTACT_INFO } from "@/lib/contact-info"

export default function PrivacyPage() {
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
          <div className="flex items-start gap-4 mb-2">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold">Privacy Policy</h1>
                <Badge variant="outline" className="text-xs">v1.0</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Mapato / sokogateOS</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Last updated: June 1, 2026</p>
        </div>

        <Separator className="mb-8" />

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Mapato ("Company," "We," "Us," or "Our") is committed to protecting the privacy of individuals 
              who use our platform, website, and services (collectively, the "Service"). This Privacy Policy 
              explains how we collect, use, disclose, and safeguard your information when you use Mapato and 
              the sokogateOS platform.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              By accessing or using the Service, you acknowledge that you have read, understood, and agree to 
              be bound by this Privacy Policy. If you do not agree with our policies and practices, please do 
              not use the Service.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              This policy complies with the Kenya Data Protection Act (2019), the General Data Protection 
              Regulation (GDPR) for users in the European Economic Area, and other applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">2. Information We Collect</h2>
            
            <h3 className="font-semibold mb-2 mt-4">2.1 Personal Information You Provide</h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We collect personal information that you voluntarily provide when you:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground leading-relaxed space-y-2 mb-3">
              <li>Register for an account (name, email address, company name, phone number)</li>
              <li>Complete onboarding or needs assessment questionnaires</li>
              <li>Contact us for support or inquiries</li>
              <li>Subscribe to our newsletter or marketing communications</li>
              <li>Participate in surveys, promotions, or research activities</li>
            </ul>

            <h3 className="font-semibold mb-2 mt-4">2.2 Information Collected Automatically</h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              When you access the Service, we may automatically collect certain information, including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground leading-relaxed space-y-2 mb-3">
              <li>Device information (browser type, operating system, IP address)</li>
              <li>Usage data (pages visited, time spent, clicks, navigation patterns)</li>
              <li>Log data (access times, referring URLs, error logs)</li>
              <li>Cookies and similar tracking technologies (see Section 6)</li>
            </ul>

            <h3 className="font-semibold mb-2 mt-4">2.3 Information from Third-Party Integrations</h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              When you connect the Service with third-party platforms (including WATI.io, QMe, Make.com, 
              Voiceflow, Instantly.ai, Zoho CRM, Sokogate, and others), we may receive information from 
              those services in accordance with your authorization and their respective privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We use the information we collect for the following purposes:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground leading-relaxed space-y-2">
              <li><strong>To Provide and Maintain the Service:</strong> Operate, maintain, and improve the Mapato platform and sokogateOS features.</li>
              <li><strong>To Automate Business Processes:</strong> Process and analyze data to power lead qualification, client onboarding, follow-up sequences, and trade operations as requested by you.</li>
              <li><strong>To Communicate with You:</strong> Send administrative information, service updates, security alerts, and support communications.</li>
              <li><strong>To Send Marketing Communications:</strong> With your consent, send newsletters, product updates, and promotional materials. You may opt out at any time.</li>
              <li><strong>To Improve the Service:</strong> Analyze usage patterns to enhance user experience, develop new features, and optimize platform performance.</li>
              <li><strong>To Ensure Security:</strong> Detect, prevent, and address fraudulent, unauthorized, or illegal activity.</li>
              <li><strong>To Comply with Legal Obligations:</strong> Fulfill our obligations under applicable laws and regulations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">4. How We Share Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We may share your information in the following circumstances:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground leading-relaxed space-y-2">
              <li><strong>With Your Consent:</strong> We share information when you have given us explicit consent to do so.</li>
              <li><strong>With Third-Party Service Providers:</strong> We engage trusted third parties to perform functions on our behalf, including hosting, analytics, payment processing, email delivery, and customer support. These providers are contractually bound to protect your information.</li>
              <li><strong>With Integration Partners:</strong> When you connect third-party services (e.g., WATI.io, Zoho CRM), we share necessary data to enable the integration as you direct.</li>
              <li><strong>For Legal Reasons:</strong> We may disclose information if required by law, legal process, or governmental request, or to protect our rights, property, or safety.</li>
              <li><strong>In Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, your information may be transferred as part of the transaction.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              We do not sell your personal information to third parties for their own marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">5. Data Subject Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Depending on your jurisdiction, you may have the following rights regarding your personal information:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground leading-relaxed space-y-2">
              <li><strong>Right to Access:</strong> Request a copy of the personal information we hold about you.</li>
              <li><strong>Right to Rectification:</strong> Request correction of inaccurate or incomplete information.</li>
              <li><strong>Right to Erasure:</strong> Request deletion of your personal information, subject to certain exceptions.</li>
              <li><strong>Right to Restrict Processing:</strong> Request restriction of processing your information in certain circumstances.</li>
              <li><strong>Right to Data Portability:</strong> Request transfer of your information to another service provider in a structured, commonly used format.</li>
              <li><strong>Right to Object:</strong> Object to processing of your information for direct marketing purposes or on grounds relating to your particular situation.</li>
              <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time where we rely on consent to process your information.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              To exercise any of these rights, please contact us at <strong>privacy@mapato.app</strong>. We will 
              respond to your request within 30 days as required by applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">6. Cookies & Tracking Technologies</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We use cookies and similar tracking technologies to enhance your experience, analyze usage, and 
              support our marketing efforts.
            </p>
            
            <h3 className="font-semibold mb-2 mt-4">Types of Cookies We Use</h3>
            <ul className="list-disc pl-6 text-muted-foreground leading-relaxed space-y-2">
              <li><strong>Essential Cookies:</strong> Required for basic platform functionality, including authentication and session management.</li>
              <li><strong>Functional Cookies:</strong> Remember your preferences and settings to personalize your experience.</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how users interact with the platform to improve performance and features.</li>
              <li><strong>Marketing Cookies:</strong> Track your activity across websites to deliver relevant advertisements.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              You can control cookies through your browser settings. Disabling certain cookies may affect platform 
              functionality. For more detailed information about our cookie practices, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">7. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We implement appropriate technical and organizational security measures to protect your personal 
              information against unauthorized access, alteration, disclosure, or destruction. These measures include:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground leading-relaxed space-y-2">
              <li>Encryption of data in transit (TLS 1.2+) and at rest (AES-256)</li>
              <li>Secure access controls and authentication protocols</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Employee training on data protection and privacy practices</li>
              <li>Incident response and breach notification procedures</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Despite our efforts, no security measure is 100% effective. We cannot guarantee the absolute security 
              of your information. In the event of a data breach that affects your personal information, we will 
              notify you in accordance with applicable legal requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">8. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We retain your personal information for as long as your account is active or as needed to provide 
              you the Service. We will retain and use your information as necessary to comply with our legal 
              obligations, resolve disputes, and enforce our agreements.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              When you delete your account, we will delete or anonymize your personal information within 90 days, 
              except where retention is required by law or for legitimate business purposes (such as tax records, 
              which may be retained for up to 7 years).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">9. WhatsApp & Communication Data</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              When you use our WhatsApp integration (powered by WATI.io), messages and contact information 
              are processed in accordance with Meta's WhatsApp Business Messaging Policy and this Privacy Policy. 
              We store message logs and contact information solely for the purpose of providing the Service.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You are responsible for obtaining all necessary consents from your contacts before initiating 
              WhatsApp communications through the platform. We rely on you to ensure your messaging practices 
              comply with applicable anti-spam and data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">10. International Data Transfers</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Your information may be transferred to and processed in countries other than your own, including 
              Kenya, the United States, and other jurisdictions where our service providers operate. We ensure 
              that appropriate safeguards are in place for such transfers, including Standard Contractual Clauses 
              where required.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">11. Third-Party Links & Services</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              The Service may contain links to third-party websites, applications, and services (including 
              WATI.io, QMe, Make.com, Voiceflow, Instantly.ai, Zoho CRM, and Sokogate). We are not responsible 
              for the privacy practices of these third parties. We encourage you to review their privacy policies 
              before providing them with your information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">12. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              The Service is not directed to individuals under the age of 18. We do not knowingly collect personal 
              information from children. If we become aware that a child has provided us with personal information, 
              we will take steps to delete such information promptly. If you believe a child has provided us with 
              personal information, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">13. Changes to This Privacy Policy</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We may update this Privacy Policy from time to time. We will notify you of material changes by 
              posting the updated policy on this page and, where appropriate, via email or in-app notification. 
              The date at the top of this policy indicates when it was last revised.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Your continued use of the Service after changes are posted constitutes your acceptance of the 
              updated policy. We encourage you to review this Privacy Policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">14. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, 
              please contact our Data Protection Officer:
            </p>
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <p className="text-sm">
                <strong>{t("contact.phone")}:</strong>{" "}
                <a href={`tel:${CONTACT_INFO.phone}`} className="text-primary hover:underline">{CONTACT_INFO.phone}</a>
              </p>
              <p className="text-sm">
                <strong>WhatsApp:</strong>{" "}
                <a href={`https://wa.me/${CONTACT_INFO.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{CONTACT_INFO.whatsapp}</a>
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
          <Link href="/terms">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" /> View Terms & Conditions
            </Button>
          </Link>
          <Link href="/signup">
            <Button>
              I Understand — Create Account <Shield className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
      <ContactBar />
    </div>
  )
}
