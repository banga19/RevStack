/**
 * Translation dictionaries for Mapato / sokogateOS
 * English (en) and KiSwahili (sw)
 */

export type Language = "en" | "sw"

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    "nav.features": "Features",
    "nav.howItWorks": "How It Works",
    "nav.pricing": "Pricing",
    "nav.results": "Results",
    "nav.signIn": "Sign in",
    "nav.getStarted": "Get started",
    "nav.signOut": "Sign out",

    // Hero
    "hero.badge": "AI-Powered Revenue Operations for B2B Trading Companies",
    "hero.title": "Your AI Operating System for",
    "hero.titleHighlight": "B2B Trade Growth",
    "hero.subtitle": "Automate lead qualification, client onboarding, and follow-ups across WhatsApp & email. One platform to capture every lead, close every deal, and scale your trading business — with or without a team.",
    "hero.cta": "Start Free",
    "hero.seeHow": "See how it works",
    "hero.trustedBy": "Trusted by trading companies in 7+ African markets",
    "hero.rating": "4.9/5 from 50+ reviews",

    // Problem
    "problem.badge": "The Problem",
    "problem.title": "B2B trading runs on WhatsApp. But you're drowning in it.",
    "problem.subtitle": "Every day, hundreds of leads message you asking for prices, stock availability, and delivery timelines. Your team spends hours on manual replies. Leads go cold. Deals slip through the cracks.",
    "problem.hours": "Hours wasted on manual replies",
    "problem.hoursDesc": "Your sales team spends 60% of their day answering the same questions about pricing, stock, and delivery.",
    "problem.leads": "Leads leak through the cracks",
    "problem.leadsDesc": "Without automated follow-up, 80% of leads never get a second touch. You're leaving money on the table.",
    "problem.pipeline": "No visibility into your pipeline",
    "problem.pipelineDesc": "You can't track which leads are hot, which need follow-up, or where your deals are getting stuck.",

    // Features
    "features.badge": "The Solution",
    "features.title": "Everything you need to automate B2B trade operations",
    "features.subtitle": "sokogateOS combines lead qualification, WhatsApp automation, client onboarding, and trade finance into one AI-powered platform.",
    "features.aiQual": "AI Lead Qualification",
    "features.aiQualDesc": "Voiceflow chatbot qualifies leads 24/7 via WhatsApp & web. Scores leads by intent, budget, and readiness.",
    "features.whatsapp": "WhatsApp Automation",
    "features.whatsappDesc": "WATI.io-powered sequences for follow-ups, nurture, and re-engagement. Pre-built templates for trading.",
    "features.email": "Email Outreach",
    "features.emailDesc": "Instantly.ai integration for cold email campaigns. Auto-warmup, A/B testing, and deliverability optimization.",
    "features.trade": "Trade Corridor Matching",
    "features.tradeDesc": "Connect buyers to sellers across China→Africa, Korea→Africa, and Africa→Africa corridors via Sokogate.",
    "features.compliance": "Compliance Automation",
    "features.complianceDesc": "Track HACCP, Halal, Organic, and Korean import certifications. Get alerts before they expire.",
    "features.finance": "Trade Finance Integration",
    "features.financeDesc": "Apply for AfDB/AFAWA funding, letters of credit, and Sokogate Pay escrow directly from the platform.",
    "features.crm": "Pipeline CRM",
    "features.crmDesc": "Visual pipeline with lead status, ERS scores, deal values, and conversion tracking. Drag-and-drop interface.",
    "features.revenue": "Revenue Forecasting",
    "features.revenueDesc": "AI-powered revenue predictions, MRR tracking, and growth modeling. Know your numbers at a glance.",
    "features.onboarding": "Client Onboarding",
    "features.onboardingDesc": "Automated onboarding flows with document collection, compliance checks, and system setup sequences.",
    "features.ers": "Export Readiness Scoring",
    "features.ersDesc": "ERS framework assesses documentation, compliance, export history, and capacity. Score out of 100.",
    "features.content": "Content Marketing Engine",
    "features.contentDesc": "SEO article planning, keyword research, and publishing workflow. 25+ articles compounding traffic.",
    "features.automations": "One-Click Automations",
    "features.automationsDesc": "Make.com-powered workflows for lead capture, follow-up sequences, booking, and reporting.",

    // How It Works
    "how.badge": "How It Works",
    "how.title": "From lead to onboarded client — fully automated",
    "how.subtitle": "A complete system that captures, qualifies, nurtures, and onboards clients without you lifting a finger.",
    "how.capture": "Capture",
    "how.captureDesc": "Leads come in via WhatsApp, website chatbot, or email. All channels route into one inbox.",
    "how.qualify": "Qualify",
    "how.qualifyDesc": "AI asks qualifying questions, scores the lead, and tags them by product interest, budget, and urgency.",
    "how.nurture": "Nurture",
    "how.nurtureDesc": "Automated WhatsApp & email sequences follow up based on lead behavior. Warm leads get booked.",
    "how.onboard": "Onboard",
    "how.onboardDesc": "Documents collected, compliance checked, systems configured. Client goes live in hours, not weeks.",

    // Integrations
    "integrations.badge": "Integration Ecosystem",
    "integrations.title": "Powered by the best automation platforms",
    "integrations.subtitle": "We don't build everything from scratch. We orchestrate the best tools into one seamless system.",

    // Pricing
    "pricing.badge": "Pricing",
    "pricing.title": "Pay as you grow. We win when you win.",
    "pricing.subtitle": "Low monthly base fee plus a success-based share on revenue generated through the platform. Inspired by the autonomous business model.",
    "pricing.starter": "Starter",
    "pricing.starterDesc": "For solo traders and small teams getting started",
    "pricing.growth": "Growth",
    "pricing.growthDesc": "For growing trading companies scaling operations",
    "pricing.enterprise": "Enterprise",
    "pricing.enterpriseDesc": "For established businesses with complex needs",
    "pricing.month": "/mo",
    "pricing.successFee": "success fee on revenue generated",
    "pricing.popular": "Most Popular",
    "pricing.getStarted": "Get started",
    "pricing.contactSales": "Contact sales",
    "pricing.trial": "All plans include a 14-day free trial. No credit card required.",
    "pricing.startTrial": "Start your trial →",
    "pricing.freeTrial": "Start Free",

    // Stats
    "stats.badge": "Real Results",
    "stats.title": "Trading companies are scaling with sokogateOS",
    "stats.qualified": "More qualified leads",
    "stats.qualifiedDesc": "AI lead qualification triples the number of sales-ready conversations.",
    "stats.responseTime": "Faster response time",
    "stats.responseTimeDesc": "Automated WhatsApp replies cut first-response time from hours to seconds.",
    "stats.reduction": "Reduction in manual work",
    "stats.reductionDesc": "Automation handles follow-ups, data entry, and reporting.",

    // Testimonial
    "testimonial.text": "\"sokogateOS automated our entire lead qualification process via WhatsApp. We went from 20 leads/month to 85 qualified conversations — and closed 3x more deals. The Korea corridor access through Sokogate is opening doors we couldn't reach before.\"",
    "testimonial.name": "Bangaly Fofana",
    "testimonial.role": "Operations Director, Ultimo Trading Ltd",

    // ICP
    "icp.badge": "Who It's For",
    "icp.title": "Built for B2B trading companies in emerging markets",
    "icp.subtitle": "Our Ideal Customer Profile (ICP) is the mid-market trading company handling high volumes of WhatsApp-based inquiries, struggling to keep up with lead qualification and follow-up.",
    "icp.fit": "You're a perfect fit if...",
    "icp.fit1": "You run an import/export or wholesale trading company in Africa",
    "icp.fit2": "You handle 50+ inbound lead inquiries per month via WhatsApp",
    "icp.fit3": "Your sales team spends >50% of time answering repetitive questions",
    "icp.fit4": "You're looking to expand into new trade corridors (Korea, China, AfCFTA)",
    "icp.fit5": "You want to onboard clients faster with automated processes",
    "icp.fit6": "You need visibility into your sales pipeline and conversion metrics",
    "icp.notFit": "This isn't for you if...",
    "icp.notFit1": "You have an enterprise team handling all sales and onboarding manually",
    "icp.notFit2": "You don't use WhatsApp for customer communication",
    "icp.notFit3": "You're a B2C direct-to-consumer business",
    "icp.notFit4": "You handle fewer than 10 leads per month",
    "icp.notFit5": "You don't need cross-border trade corridor access",
    "icp.notFit6": "You have a fully custom-built CRM already in place",

    // CTA
    "cta.badge": "Get Started Today",
    "cta.title": "Ready to automate your B2B trade operations?",
    "cta.subtitle": "Join trading companies already using sokogateOS to qualify leads, close deals, and scale across African and international trade corridors.",
    "cta.emailPlaceholder": "Enter your work email",
    "cta.getAccess": "Get early access",
    "cta.subscribed": "You're on the list! We'll be in touch soon.",
    "cta.terms": "Terms & Conditions",

    // Footer
    "footer.tagline": "AI-powered B2B trade automation for Africa.",
    "footer.terms": "Terms",
    "footer.privacy": "Privacy",
    "footer.contact": "Contact",
    "footer.contactUs": "Contact Us",

    // Form
    "form.fullName": "Full name",
    "form.email": "Email address",
    "form.password": "Password",
    "form.confirmPassword": "Confirm password",
    "form.createAccount": "Create account",
    "form.creatingAccount": "Creating account...",
    "form.alreadyHaveAccount": "Already have an account?",
    "form.signIn": "Sign in",
    "form.agreeTerms": "I agree to the",
    "form.and": "and",
    "form.termsConditions": "Terms & Conditions",
    "form.privacyPolicy": "Privacy Policy",
    "form.understand": "I understand that Mapato charges a subscription fee plus a success-based fee on revenue generated through the platform.",
    "form.agree": "I Agree — Create Account",

    // Signup success
    "signup.success": "Account created!",
    "signup.redirecting": "Redirecting you to sign in...",
    "signup.signInNow": "Sign in now",

    // Auth pages
    "auth.welcomeBack": "Welcome back",
    "auth.signInTitle": "Sign in to your Mapato account",
    "auth.newHere": "New to Mapato?",
    "auth.takeAssessment": "Take our 2-min needs assessment to personalize your experience",
    "auth.dontHaveAccount": "Don't have an account?",
    "auth.createOne": "Create one",

    // Language
    "lang.switchTo": "Kiswahili",
    "lang.current": "English",

    // Contact
    "contact.title": "Contact Us",
    "contact.phone": "Phone / WhatsApp",
    "contact.email": "Email",
    "contact.address": "Address",
    "contact.reachOut": "Reach out to us anytime",
    "contact.callNow": "Call or WhatsApp now",

    // Back
    "back.home": "Back to home",

    // Terms
    "terms.title": "Terms & Conditions",
    "terms.lastUpdated": "Last updated: June 1, 2026",

    // Privacy
    "privacy.title": "Privacy Policy",

    // Logo cloud
    "logoCloud.title": "Integrated with leading platforms",
  },

  sw: {
    // Navigation
    "nav.features": "Vipengele",
    "nav.howItWorks": "Jinsi Inavyofanya Kazi",
    "nav.pricing": "Bei",
    "nav.results": "Matokeo",
    "nav.signIn": "Ingia",
    "nav.getStarted": "Anza",
    "nav.signOut": "Toka",

    // Hero
    "hero.badge": "Shughuli za Mapato Zinazoendeshwa na AI kwa Kampuni za Biashara za B2B",
    "hero.title": "Mfumo Wako wa Uendeshaji wa AI kwa",
    "hero.titleHighlight": "Ukuaji wa Biashara ya B2B",
    "hero.subtitle": "Automatishe uhakiki wa wateja, uingizaji wa wateja wapya, na ufuatiliaji kwa njia ya WhatsApp & barua pepe. Jukwaa moja la kukamata kila kiongozi, kufunga kila mpango, na kukuza biashara yako — na au bila timu.",
    "hero.cta": "Anza Bure",
    "hero.seeHow": "Tazama jinsi inavyofanya kazi",
    "hero.trustedBy": "Inaaminika na kampuni za biashara katika masoko 7+ ya Afrika",
    "hero.rating": "4.9/5 kutoka kwa hakiki 50+",

    // Problem
    "problem.badge": "Tatizo",
    "problem.title": "Biashara ya B2B inaendeshwa kwa WhatsApp. Lakini unazama ndani yake.",
    "problem.subtitle": "Kila siku, mamia ya wateja wanakutumia ujumbe kuuliza bei, upatikanaji wa bidhaa, na muda wa usafirishaji. Timu yako inatumia masaa kujibu kwa mikono. Wateja wanapotea. Mipango inateleza.",
    "problem.hours": "Masaa yanapotea kwa majibu ya mikono",
    "problem.hoursDesc": "Timu yako ya mauzo inatumia 60% ya siku yao kujibu maswali sawa kuhusu bei, hisa, na usafirishaji.",
    "problem.leads": "Wateja wanapotea kupitia nyufa",
    "problem.leadsDesc": "Bila ufuatiliaji wa kiotomatiki, 80% ya wateja hawapati mguso wa pili. Unaacha pesa mezani.",
    "problem.pipeline": "Hakuna mwonekano katika bomba lako la mauzo",
    "problem.pipelineDesc": "Huwezi kufuatilia ni wateja gani wako moto, ambao wanahitaji ufuatiliaji, au ambapo mipango yako inakwama.",

    // Features
    "features.badge": "Suluhisho",
    "features.title": "Kila kitu unachohitaji kuautomatishe shughuli za biashara ya B2B",
    "features.subtitle": "sokogateOS inachanganya uhakiki wa wateja, automatishe ya WhatsApp, uingizaji wa wateja, na fedha za biashara katika jukwaa moja linaloendeshwa na AI.",
    "features.aiQual": "Uhakiki wa Wateja kwa AI",
    "features.aiQualDesc": "Chatbot ya Voiceflow inahakiki wateja 24/7 kupitia WhatsApp & wavuti. Inakadiria wateja kwa nia, bajeti, na utayari.",
    "features.whatsapp": "Automatishe ya WhatsApp",
    "features.whatsappDesc": "Mifuatano inayoendeshwa na WATI.io kwa ufuatiliaji, malezi, na kushirikisha tena. Violezo vilivyojengwa tayari kwa biashara.",
    "features.email": "Ufikiaji kwa Barua Pepe",
    "features.emailDesc": "Muunganisho wa Instantly.ai kwa kampeni za barua pepe za nje. Auto-warmup, A/B testing, na uboreshaji wa uwasilishaji.",
    "features.trade": "Ulinganishaji wa Njia za Biashara",
    "features.tradeDesc": "Unganisha wanunuzi kwa wauzaji katika njia za China→Afrika, Korea→Afrika, na Afrika→Afrika kupitia Sokogate.",
    "features.compliance": "Automatishe ya Utiifu",
    "features.complianceDesc": "Fuatilia vyeti vya HACCP, Halal, Organic, na uagizaji wa Korea. Pata tahadhari kabla hazijaisha.",
    "features.finance": "Muunganisho wa Fedha za Biashara",
    "features.financeDesc": "Omba fedha za AfDB/AFAWA, barua za mkopo, na Sokogate Pay escrow moja kwa moja kutoka kwa jukwaa.",
    "features.crm": "CRM ya Bomba la Mauzo",
    "features.crmDesc": "Bomba la mauzo linaloonekana kwa hali ya wateja, alama za ERS, thamani za mipango, na ufuatiliaji wa ubadilishaji. Kiolesura cha buruta-na-achia.",
    "features.revenue": "Utabiri wa Mapato",
    "features.revenueDesc": "Utabiri wa mapato unaoendeshwa na AI, ufuatiliaji wa MRR, na uundaji wa ukuaji. Jua namba zako kwa mtazamo mmoja.",
    "features.onboarding": "Uingizaji wa Wateja",
    "features.onboardingDesc": "Mifuatano ya uingizaji wa kiotomatiki na ukusanyaji wa hati, ukaguzi wa utiifu, na usanidi wa mfumo.",
    "features.ers": "Ukadiriaji wa Utayari wa Kuuza Nje",
    "features.ersDesc": "Mfumo wa ERS unatathmini nyaraka, utiifu, historia ya usafirishaji, na uwezo. Kadiria kati ya 100.",
    "features.content": "Injini ya Masoko ya Maudhui",
    "features.contentDesc": "Mipango ya makala ya SEO, utafiti wa maneno muhimu, na mfumo wa kuchapisha. Makala 25+ yanayochanganya mtiririko.",
    "features.automations": "Automatishe kwa Bonyeza Moja",
    "features.automationsDesc": "Worflow za Make.com kwa ukamataji wa wateja, mifuatano ya ufuatiliaji, kuhifadhi, na kuripoti.",

    // How It Works
    "how.badge": "Jinsi Inavyofanya Kazi",
    "how.title": "Kutoka kiongozi hadi mteja aliyesajiliwa — kiotomatiki kabisa",
    "how.subtitle": "Mfumo kamili unaowakamata, kuwahakiki, kuwalea, na kuwasajili wateja bila ya wewe kuinua kidole.",
    "how.capture": "Kamata",
    "how.captureDesc": "Wateja huingia kupitia WhatsApp, chatbot ya tovuti, au barua pepe. Njia zote zinaelekea kwenye kikasha kimoja.",
    "how.qualify": "Hakiki",
    "how.qualifyDesc": "AI inauliza maswali ya kuhakiki, inakadiria kiongozi, na inawapa lebo kwa nia ya bidhaa, bajeti, na uharaka.",
    "how.nurture": "Lea",
    "how.nurtureDesc": "Mifuatano ya kiotomatiki ya WhatsApp & barua pepe inafuatilia kulingana na tabia ya kiongozi. Wateja wa joto wanapata nafasi.",
    "how.onboard": "Sajili",
    "how.onboardDesc": "Hati zinakusanywa, utiifu unaangaliwa, mifumo inasanidiwa. Mteja anaanza kufanya kazi kwa masaa, si wiki.",

    // Integrations
    "integrations.badge": "Mfumo wa Muunganisho",
    "integrations.title": "Inaendeshwa na majukwaa bora ya automatishe",
    "integrations.subtitle": "Hatujengi kila kitu kutoka mwanzo. Tunapanga zana bora katika mfumo mmoja usio na mshono.",

    // Pricing
    "pricing.badge": "Bei",
    "pricing.title": "Lipa unavyokua. Tunashinda unaposhinda.",
    "pricing.subtitle": "Ada ya chini ya kila mwezi pamoja na sehemu ya mafanikio kwenye mapato yanayotokana kupitia jukwaa. Imeongozwa na mfano wa biashara wa kujitegemea.",
    "pricing.starter": "Mwanzo",
    "pricing.starterDesc": "Kwa wafanyabiashara pekee na timu ndogo zinazoanza",
    "pricing.growth": "Ukuaji",
    "pricing.growthDesc": "Kwa kampuni za biashara zinazokua zinazopanua shughuli",
    "pricing.enterprise": "Biashara",
    "pricing.enterpriseDesc": "Kwa biashara zilizoanzishwa zenye mahitaji changamano",
    "pricing.month": "/mw",
    "pricing.successFee": "ada ya mafanikio kwenye mapato yanayotokana",
    "pricing.popular": "Inayopendwa Zaidi",
    "pricing.getStarted": "Anza",
    "pricing.contactSales": "Wasiliana na mauzo",
    "pricing.trial": "Mipango yote inajumuisha jaribio la siku 14 bure. Hakuna kadi ya mkopo inayohitajika.",
    "pricing.startTrial": "Anza jaribio →",
    "pricing.freeTrial": "Anza Bure",

    // Stats
    "stats.badge": "Matokeo Halisi",
    "stats.title": "Kampuni za biashara zinakua na sokogateOS",
    "stats.qualified": "Wateja waliohitimu zaidi",
    "stats.qualifiedDesc": "Uhakiki wa wateja kwa AI unazidisha mara tatu idadi ya mazungumzo tayari kwa mauzo.",
    "stats.responseTime": "Muda wa kujibu haraka",
    "stats.responseTimeDesc": "Majibu ya kiotomatiki ya WhatsApp yanapunguza muda wa kujibu mara ya kwanza kutoka masaa hadi sekunde.",
    "stats.reduction": "Kupungua kwa kazi ya mikono",
    "stats.reductionDesc": "Automatishe inashughulikia ufuatiliaji, uingizaji wa data, na kuripoti.",

    // Testimonial
    "testimonial.text": "\"sokogateOS iliautomatishe mchakato wetu wote wa uhakiki wa wateja kupitia WhatsApp. Tulitoka wateja 20/mwezi hadi mazungumzo 85 yaliyohitimu — na tukafunga mipango mara 3 zaidi. Upatikanaji wa njia ya Korea kupitia Sokogate unafungua milango ambayo hatukuweza kufikia hapo awali.\"",
    "testimonial.name": "Bangaly Fofana",
    "testimonial.role": "Mkurugenzi wa Uendeshaji, Ultimo Trading Ltd",

    // ICP
    "icp.badge": "Ni kwa Ajili ya Nani",
    "icp.title": "Imejengwa kwa kampuni za biashara za B2B katika masoko yanayoibuka",
    "icp.subtitle": "Wasifu wetu Bora wa Mteja (ICP) ni kampuni ya biashara ya soko la kati inayoshughulikia kiasi kikubwa cha maswali ya WhatsApp, ikijitahidi kuendelea na uhakiki wa wateja na ufuatiliaji.",
    "icp.fit": "Unafaa kabisa kama...",
    "icp.fit1": "Unaendesha kampuni ya kuagiza/kuuza nje au ya jumla Afrika",
    "icp.fit2": "Unashughulikia maswali 50+ ya wateja kwa mwezi kupitia WhatsApp",
    "icp.fit3": "Timu yako ya mauzo inatumia >50% ya muda kujibu maswali yanayorudiwa",
    "icp.fit4": "Unatafuta kupanua hadi njia mpya za biashara (Korea, China, AfCFTA)",
    "icp.fit5": "Unataka kusajili wateja haraka kwa michakato ya kiotomatiki",
    "icp.fit6": "Unahitaji mwonekano katika bomba lako la mauzo na vipimo vya ubadilishaji",
    "icp.notFit": "Hii si kwako kama...",
    "icp.notFit1": "Una timu ya biashara inayoshughulikia mauzo yote na uingizaji kwa mikono",
    "icp.notFit2": "Hutumii WhatsApp kwa mawasiliano ya wateja",
    "icp.notFit3": "Wewe ni biashara ya B2C moja kwa moja kwa mlaji",
    "icp.notFit4": "Unashughulikia chini ya wateja 10 kwa mwezi",
    "icp.notFit5": "Huhitaji upatikanaji wa njia za biashara za kimataifa",
    "icp.notFit6": "Una CRM iliyojengwa maalum tayari",

    // CTA
    "cta.badge": "Anza Leo",
    "cta.title": "Uko tayari kuautomatishe shughuli zako za biashara za B2B?",
    "cta.subtitle": "Jiunge na kampuni za biashara tayari zinazotumia sokogateOS kuhakiki wateja, kufunga mipango, na kukua katika njia za biashara za Afrika na kimataifa.",
    "cta.emailPlaceholder": "Ingiza barua pepe yako ya kazi",
    "cta.getAccess": "Pata ufikiaji wa mapema",
    "cta.subscribed": "Uko kwenye orodha! Tutawasiliana hivi karibuni.",
    "cta.terms": "Sheria na Masharti",

    // Footer
    "footer.tagline": "Automatishe ya biashara ya B2B inayoendeshwa na AI kwa Afrika.",
    "footer.terms": "Sheria",
    "footer.privacy": "Faragha",
    "footer.contact": "Wasiliana",
    "footer.contactUs": "Wasiliana Nasi",

    // Form
    "form.fullName": "Jina kamili",
    "form.email": "Barua pepe",
    "form.password": "Nywila",
    "form.confirmPassword": "Thibitisha nywila",
    "form.createAccount": "Unda akaunti",
    "form.creatingAccount": "Inaunda akaunti...",
    "form.alreadyHaveAccount": "Tayari una akaunti?",
    "form.signIn": "Ingia",
    "form.agreeTerms": "Ninakubali",
    "form.and": "na",
    "form.termsConditions": "Sheria na Masharti",
    "form.privacyPolicy": "Sera ya Faragha",
    "form.understand": "Ninaelewa kuwa Mapato inatoza ada ya usajili pamoja na ada ya mafanikio kwenye mapato yanayotokana kupitia jukwaa.",
    "form.agree": "Ninakubali — Unda Akaunti",

    // Signup success
    "signup.success": "Akaunti imeundwa!",
    "signup.redirecting": "Inakuelekeza kuingia...",
    "signup.signInNow": "Ingia sasa",

    // Auth pages
    "auth.welcomeBack": "Karibu tena",
    "auth.signInTitle": "Ingia kwenye akaunti yako ya Mapato",
    "auth.newHere": "Mgeni kwa Mapato?",
    "auth.takeAssessment": "Chukua tathmini ya dakika 2 ili kubinafsisha uzoefu wako",
    "auth.dontHaveAccount": "Huna akaunti?",
    "auth.createOne": "Unda moja",

    // Language
    "lang.switchTo": "English",
    "lang.current": "Kiswahili",

    // Contact
    "contact.title": "Wasiliana Nasi",
    "contact.phone": "Simu / WhatsApp",
    "contact.email": "Barua pepe",
    "contact.address": "Anwani",
    "contact.reachOut": "Wasiliana nasi wakati wowote",
    "contact.callNow": "Piga simu au WhatsApp sasa",

    // Back
    "back.home": "Rudi nyumbani",

    // Terms
    "terms.title": "Sheria na Masharti",
    "terms.lastUpdated": "Ilisasishwa mwisho: Juni 1, 2026",

    // Privacy
    "privacy.title": "Sera ya Faragha",

    // Logo cloud
    "logoCloud.title": "Imeunganishwa na majukwaa yanayoongoza",
  },
}

export function t(key: string, lang: Language): string {
  return translations[lang]?.[key] || translations["en"]?.[key] || key
}
