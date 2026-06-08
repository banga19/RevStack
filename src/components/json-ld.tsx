/**
 * JSON-LD Structured Data
 *
 * Provides search engines and AI answer engines (Google SGE, ChatGPT, Perplexity, Bard)
 * with structured information about Mapato. This improves:
 *
 *   SEO: Rich snippets, Knowledge Panel, sitelinks searchbox
 *   AEO: Factual answers in AI-generated responses (ChatGPT, Perplexity, Google AI Overviews)
 *
 * Schemas included:
 *   - Organization (with logo, social profiles, contact)
 *   - WebSite (with SearchAction for sitelinks searchbox)
 *   - BreadcrumbList (injected per-page via helper)
 *   - FAQPage (for common Mapato questions)
 *   - SoftwareApplication (for app store indexing)
 *   - Product (for pricing tiers)
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://mapato.app"
const ORG_NAME = "Mapato"
const ORG_DESCRIPTION =
  "AI-powered B2B trade automation platform — qualify leads, automate onboarding, manage trade corridors, and run autonomous AI agents for African import/export businesses."

// ── Organization Schema ────────────────────────────────────────

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ORG_NAME,
    url: BASE_URL,
    logo: `${BASE_URL}/icons/icon.svg`,
    description: ORG_DESCRIPTION,
    slogan:
      "Your AI Revenue Operations for B2B Trade — Africa to Korea, China, and global markets.",
    foundingDate: "2025",
    email: "bangali@ultimotradingltd.co.ke",
    sameAs: [
      "https://sokogate.com",
      "https://ultimotradingltd.co.ke",
      "https://polsia.com",
    ],
    knowsAbout: [
      "B2B trade automation",
      "AI lead qualification",
      "WhatsApp Business API",
      "Export Readiness Scoring",
      "Korea-Africa trade corridor",
      "Trade finance",
      "Compliance tracking",
    ],
    address: {
      "@type": "PostalAddress",
      addressCountry: "KE",
    },
    contactPoint: {
      "@type": "ContactPoint",
      email: "bangali@ultimotradingltd.co.ke",
      contactType: "sales",
      availableLanguage: ["English", "Swahili"],
    },
  }
}

// ── WebSite Schema (with SearchAction for sitelinks searchbox) ─

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: ORG_NAME,
    url: BASE_URL,
    description: ORG_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/docs?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }
}

// ── FAQ Schema ────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    question: "What is Mapato?",
    answer:
      "Mapato is an AI-powered revenue operations platform built specifically for B2B trading companies in Africa. It automates lead qualification via WhatsApp, manages trade corridors (especially Korea-Africa), tracks compliance certifications, and provides autonomous AI agents (God Mode) that run your operations 24/7.",
  },
  {
    question: "How much does Mapato cost?",
    answer:
      "Mapato starts at $50/month (Starter) with plans up to $500/month (Enterprise). All plans include a 3-day free trial with full access. Success fees start from 10% of revenue generated — half of what comparable platforms charge.",
  },
  {
    question: "Does Mapato work with WhatsApp?",
    answer:
      "Yes. Mapato integrates with WATI.io to provide WhatsApp Business API capabilities — automated lead qualification chatbots, bulk messaging, follow-up sequences, and shared inbox management.",
  },
  {
    question: "What is the Korea-Africa trade corridor?",
    answer:
      "The Korea-Africa corridor is Mapato's flagship trade route. We match African exporters (coffee, cocoa, minerals, textiles, etc.) with Korean corporate procurement teams from companies like Hyundai, Samsung, LG, and POSCO through our Sokogate platform partnership.",
  },
  {
    question: "What is God Mode?",
    answer:
      "God Mode is Mapato's autonomous AI agent system — inspired by Polsia. It runs 24/7 without human intervention: qualifying leads, sending follow-ups, checking compliance expiry, matching trade corridors, and generating revenue reports. Available on Growth and Enterprise plans.",
  },
  {
    question: "Do I need technical skills to use Mapato?",
    answer:
      "No. Mapato is designed for non-technical trading professionals. The onboarding wizard guides you through setup in under 15 minutes. Pre-built templates for lead qualification, WhatsApp automation, and compliance tracking work out of the box.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "Mapato accepts M-Pesa, Mobile Money, Visa, and Mastercard payments through Flutterwave — Africa's leading payment processor.",
  },
  {
    question: "How does the Export Readiness Score (ERS) work?",
    answer:
      "ERS is Mapato's proprietary scoring system that evaluates an exporter's readiness for international trade across four dimensions: documentation (25 pts), compliance (25 pts), export history (25 pts), and verified capacity (25 pts). Scores above 80 indicate 'export-ready' status.",
  },
]

export function faqSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  }
}

// ── BreadcrumbList Schema ─────────────────────────────────────

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${BASE_URL}${item.url}`,
    })),
  }
}

// ── SoftwareApplication Schema ─────────────────────────────────

export function softwareAppSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: ORG_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: [
      {
        "@type": "Offer",
        name: "Starter",
        price: "50",
        priceCurrency: "USD",
        priceValidUntil: "2027-12-31",
        description: "For solo traders and small teams getting started",
      },
      {
        "@type": "Offer",
        name: "Growth",
        price: "200",
        priceCurrency: "USD",
        priceValidUntil: "2027-12-31",
        description: "For growing trading companies scaling operations",
      },
      {
        "@type": "Offer",
        name: "Enterprise",
        price: "500",
        priceCurrency: "USD",
        priceValidUntil: "2027-12-31",
        description: "Full-featured solution for established businesses",
      },
    ],
  }
}

// ── Aggregated Schema (all in one script tag) ─────────────────

export function allSchemas() {
  return [organizationSchema(), websiteSchema(), faqSchema(), softwareAppSchema()]
}
