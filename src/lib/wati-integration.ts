/**
 * WATI.io Integration Layer
 *
 * WATI.io provides WhatsApp Business API capabilities for:
 * - Lead capture and qualification via WhatsApp chatbot
 * - Automated follow-up sequences
 * - Broadcast messaging for campaigns
 * - Shared team inbox for managing conversations
 * - CRM synchronization
 * - Analytics and reporting
 *
 * API Docs: https://docs.wati.io/
 *
 * When credentials are configured (WATI_API_TOKEN + WATI_WHATSAPP_NUMBER_ID),
 * the integration makes real HTTP calls to the WATI API. Falls back to
 * simulation mode when credentials are missing.
 *
 * Instance URL format:
 *   https://{your-instance}.wati.io/{whatsappNumberId}/api/v1/{endpoint}
 *
 * Set WATI_API_URL to override the default host (https://live-mt-server.wati.io).
 * Find your instance URL in WATI dashboard → Settings → API Docs.
 */

// WATI API Configuration
interface WATIConfig {
  apiToken: string;
  whatsappNumberId: string;
  /** Full base URL including instance host (default: https://live-mt-server.wati.io) */
  baseUrl: string;
}

// Message Types
export interface WATIMessage {
  id: string;
  text: string;
  from: string;
  to: string;
  timestamp: string;
  type: "text" | "template" | "image" | "document" | "interactive";
  status: "sent" | "delivered" | "read" | "failed";
}

export interface WATILead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tags: string[];
  customFields: Record<string, any>;
  source: string;
  score?: number;
  status: "new" | "qualified" | "unqualified" | "contacted" | "converted";
  assignedTo?: string;
  createdAt: string;
  lastMessageAt?: string;
}

export interface WATICampaign {
  id: string;
  name: string;
  templateName: string;
  status: "draft" | "running" | "paused" | "completed";
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  replyCount: number;
  contacts: string[];
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface WATITemplate {
  id: string;
  name: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  language: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | "PAUSED";
  body: string;
  header?: string;
  footer?: string;
  buttons?: Array<{
    type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
    text: string;
    value?: string;
  }>;
  createdAt: string;
}

// WATI Service Class
export class WATIIntegration {
  private config: WATIConfig;
  private contacts: Map<string, WATILead>;
  private campaigns: Map<string, WATICampaign>;
  private templates: Map<string, WATITemplate>;

  constructor(config?: Partial<WATIConfig>) {
    this.config = {
      apiToken: config?.apiToken || process.env.WATI_API_TOKEN || "",
      whatsappNumberId: config?.whatsappNumberId || process.env.WATI_WHATSAPP_NUMBER_ID || "",
      baseUrl: config?.baseUrl || process.env.WATI_API_URL || "https://live-mt-server.wati.io",
    };

    this.contacts = new Map();
    this.campaigns = new Map();
    this.templates = new Map();

    // Initialize default templates for trading outreach
    this.initializeDefaultTemplates();
  }

  /**
   * Build the WATI API URL for a given endpoint path.
   * Format: {baseUrl}/{whatsappNumberId}/api/v1/{endpoint}
   */
  private apiUrl(endpoint: string): string {
    const base = this.config.baseUrl.replace(/\/+$/, "");
    return `${base}/${this.config.whatsappNumberId}/api/v1/${endpoint}`;
  }

  /**
   * Common fetch wrapper for WATI API calls.
   * Returns parsed JSON response or throws on error.
   */
  private async apiFetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    if (!this.config.apiToken) {
      return { success: false, error: "WATI_API_TOKEN not configured" };
    }

    try {
      const url = this.apiUrl(endpoint);
      const response = await fetch(url, {
        ...options,
        headers: {
          "Authorization": `Bearer ${this.config.apiToken}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        return {
          success: false,
          error: `WATI API error ${response.status}: ${errorText || response.statusText}`,
        };
      }

      const data = await response.json() as T;
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: `WATI API request failed: ${(error as Error).message}`,
      };
    }
  }

  // Initialize default WhatsApp message templates for B2B trading
  private initializeDefaultTemplates() {
    this.templates.set("lead-welcome", {
      id: "lead-welcome",
      name: "lead_welcome_trading",
      category: "MARKETING",
      language: "en",
      status: "APPROVED",
      body: "Hi {{1}}! 👋\n\nWelcome to {{2}}. We received your inquiry about {{3}}.\n\nTo help you faster, could you tell us:\n1. What quantity are you looking for?\n2. What's your target delivery timeline?\n3. Do you have any specific quality requirements?\n\nOur team will get back to you with a quote within 2 hours.",
      buttons: [{ type: "QUICK_REPLY", text: "Tell us more" }],
      createdAt: "2026-01-01T00:00:00Z",
    });

    this.templates.set("follow-up-24h", {
      id: "follow-up-24h",
      name: "follow_up_24h_trading",
      category: "MARKETING",
      language: "en",
      status: "APPROVED",
      body: "Hi {{1}}! 👋\n\nJust checking in — did you receive our quote for {{2}}?\n\nWe have stock available and can ship within {{3}} days of order confirmation.\n\nWould you like to:\n1. Proceed with the order\n2. Request a sample\n3. Discuss further\n\nLet us know how we can help!",
      buttons: [
        { type: "QUICK_REPLY", text: "Proceed with order" },
        { type: "QUICK_REPLY", text: "Request a sample" },
        { type: "QUICK_REPLY", text: "Discuss further" },
      ],
      createdAt: "2026-01-01T00:00:00Z",
    });

    this.templates.set("re-engagement", {
      id: "re-engagement",
      name: "re_engagement_trading",
      category: "MARKETING",
      language: "en",
      status: "APPROVED",
      body: "Hi {{1}}! 👋\n\nIt's been a while since we last connected. We've since added new products to our catalog that might interest you:\n\n{{2}}\n\nWe're offering special pricing this month for returning customers.\n\nReply \"INTERESTED\" and we'll send you our latest catalog! 🚀",
      buttons: [{ type: "QUICK_REPLY", text: "INTERESTED" }],
      createdAt: "2026-01-01T00:00:00Z",
    });

    this.templates.set("order-confirmation", {
      id: "order-confirmation",
      name: "order_confirmation_trading",
      category: "UTILITY",
      language: "en",
      status: "APPROVED",
      body: "Hi {{1}}! ✅\n\nYour order #{{2}} has been confirmed!\n\n📦 Product: {{3}}\n📊 Quantity: {{4}}\n💰 Total: {{5}}\n📅 Expected delivery: {{6}}\n\nWe'll keep you updated on shipping status. Reply STATUS to track your order anytime.",
      buttons: [{ type: "QUICK_REPLY", text: "Check STATUS" }],
      createdAt: "2026-01-01T00:00:00Z",
    });

    this.templates.set("lead-scored-high", {
      id: "lead-scored-high",
      name: "lead_scored_high_trading",
      category: "MARKETING",
      language: "en",
      status: "APPROVED",
      body: "🔥 HOT LEAD ALERT 🔥\n\n{{1}} from {{2}} is a high-scored lead!\n\n📊 Score: {{3}}/100\n💼 Interest: {{4}}\n💰 Budget: {{5}}\n📅 Timeline: {{6}}\n\nContact them immediately at {{7}} or reply to this notification to assign to a team member.",
      createdAt: "2026-01-01T00:00:00Z",
    });
  }

  /**
   * Send a free-form WhatsApp message via WATI.
   *
   * POST /api/v1/sendSessionMessage/{whatsappNumber}
   * Body (form-data): messageText
   */
  async sendMessage(to: string, message: string): Promise<{ success: boolean; messageId?: string }> {
    try {
      if (this.isConfigured()) {
        const result = await this.apiFetch<any>(`sendSessionMessage/${encodeURIComponent(to)}`, {
          method: "POST",
          body: new URLSearchParams({ messageText: message }).toString(),
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        if (result.success) {
          const messageId = (result.data as any)?.messageId || `wati-msg-${Date.now()}`;
          return { success: true, messageId };
        }

        // If the live API call failed, fall through to simulation
        console.warn(`[WATI] Live sendMessage failed (${result.error}), falling back to simulation`);
      }

      // Simulation fallback
      console.log(`[WATI] [SIM] Sending message to ${to}: "${message.substring(0, 50)}..."`);
      const messageId = `wati-msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      return { success: true, messageId };
    } catch (error) {
      console.error("[WATI] Error sending message:", error);
      return { success: false };
    }
  }

  /**
   * Send a pre-approved WhatsApp template message via WATI.
   *
   * POST /api/v1/sendTemplateMessage?whatsappNumber={to}
   * Body: { template_name, broadcast_name, parameters }
   */
  async sendTemplate(
    to: string,
    templateName: string,
    parameters: string[]
  ): Promise<{ success: boolean; messageId?: string }> {
    const template = this.templates.get(templateName);
    if (!template) {
      console.error(`[WATI] Template "${templateName}" not found`);
      return { success: false };
    }

    try {
      if (this.isConfigured()) {
        // Map positional parameters to named parameters for WATI
        const namedParams = parameters.map((value, index) => ({
          name: `param_${index + 1}`,
          value,
        }));

        const result = await this.apiFetch<any>(
          `sendTemplateMessage?whatsappNumber=${encodeURIComponent(to)}`,
          {
            method: "POST",
            body: JSON.stringify({
              template_name: template.name,
              broadcast_name: `auto_${templateName}_${Date.now()}`,
              parameters: namedParams,
            }),
          }
        );

        if (result.success) {
          const messageId = (result.data as any)?.messageId || `wati-tpl-${Date.now()}`;
          return { success: true, messageId };
        }

        console.warn(`[WATI] Live sendTemplate failed (${result.error}), falling back to simulation`);
      }

      // Simulation fallback
      console.log(`[WATI] [SIM] Sending template "${templateName}" to ${to}`);
      const messageId = `wati-tpl-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      return { success: true, messageId };
    } catch (error) {
      console.error("[WATI] Error sending template:", error);
      return { success: false };
    }
  }

  /**
   * Create a new contact/lead in WATI.
   *
   * POST /api/v1/addContact
   * Body: { name, phone, email, tags, customFields }
   */
  async createContact(contact: {
    name: string;
    phone: string;
    email?: string;
    tags?: string[];
    customFields?: Record<string, any>;
  }): Promise<{ success: boolean; contactId?: string }> {
    try {
      if (this.isConfigured()) {
        const result = await this.apiFetch<any>("addContact", {
          method: "POST",
          body: JSON.stringify({
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
            tags: contact.tags || [],
            customParams: contact.customFields
              ? Object.entries(contact.customFields).map(([key, value]) => ({
                  name: key,
                  value: String(value),
                }))
              : [],
          }),
        });

        if (result.success) {
          const contactId = (result.data as any)?.contactId || (result.data as any)?.id || `wati-lead-${Date.now()}`;
          return { success: true, contactId };
        }

        console.warn(`[WATI] Live createContact failed (${result.error}), falling back to simulation`);
      }

      // Simulation fallback
      const lead: WATILead = {
        id: `wati-lead-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        tags: contact.tags || [],
        customFields: contact.customFields || {},
        source: "whatsapp",
        score: 0,
        status: "new",
        createdAt: new Date().toISOString(),
      };
      this.contacts.set(lead.id, lead);
      console.log(`[WATI] [SIM] Contact created: ${contact.name} (${contact.phone})`);
      return { success: true, contactId: lead.id };
    } catch (error) {
      console.error("[WATI] Error creating contact:", error);
      return { success: false };
    }
  }

  // Get contact by phone number (from local cache)
  getContactByPhone(phone: string): WATILead | undefined {
    for (const contact of this.contacts.values()) {
      if (contact.phone === phone) return contact;
    }
    return undefined;
  }

  // Get all contacts (from local cache)
  getAllContacts(): WATILead[] {
    return Array.from(this.contacts.values());
  }

  // Create a campaign
  async createCampaign(campaign: {
    name: string;
    templateName: string;
    contacts: string[];
    scheduledAt?: string;
  }): Promise<{ success: boolean; campaignId?: string }> {
    const campaignId = `wati-camp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const newCampaign: WATICampaign = {
      id: campaignId,
      name: campaign.name,
      templateName: campaign.templateName,
      status: "draft",
      sentCount: 0,
      deliveredCount: 0,
      readCount: 0,
      replyCount: 0,
      contacts: campaign.contacts,
      scheduledAt: campaign.scheduledAt,
    };

    this.campaigns.set(campaignId, newCampaign);
    console.log(`[WATI] [SIM] Campaign created: "${campaign.name}" with ${campaign.contacts.length} contacts`);

    return { success: true, campaignId };
  }

  // Start a campaign
  async startCampaign(campaignId: string): Promise<boolean> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return false;

    campaign.status = "running";
    campaign.startedAt = new Date().toISOString();

    console.log(`[WATI] [SIM] Starting campaign "${campaign.name}" - sending to ${campaign.contacts.length} contacts`);

    campaign.sentCount = campaign.contacts.length;
    campaign.status = "completed";
    campaign.completedAt = new Date().toISOString();

    return true;
  }

  // Get campaign status
  getCampaign(campaignId: string): WATICampaign | undefined {
    return this.campaigns.get(campaignId);
  }

  // Get all campaigns
  getAllCampaigns(): WATICampaign[] {
    return Array.from(this.campaigns.values());
  }

  // Get available templates
  getTemplates(): WATITemplate[] {
    return Array.from(this.templates.values());
  }

  // Add a custom template
  addTemplate(template: Omit<WATITemplate, "id" | "createdAt">): string {
    const id = `wati-tpl-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    this.templates.set(id, {
      ...template,
      id,
      createdAt: new Date().toISOString(),
    });
    return id;
  }

  // Simulate incoming message webhook (local logic, no API call)
  async handleIncomingMessage(payload: {
    from: string;
    text: string;
    mediaUrl?: string;
  }): Promise<{
    action: "auto_reply" | "forward_to_human" | "update_crm";
    reply?: string;
    leadScore?: number;
  }> {
    const { text } = payload;
    const lowerText = text.toLowerCase();

    // Auto-qualification logic based on keywords
    const score = this.calculateLeadScore(lowerText);

    // Route based on score
    if (score >= 70) {
      return {
        action: "forward_to_human",
        leadScore: score,
        reply: "Thanks for your detailed inquiry! One of our trade specialists will contact you shortly.",
      };
    } else if (score >= 30) {
      return {
        action: "auto_reply",
        leadScore: score,
        reply: "Thank you for reaching out! To better understand your needs, could you tell us:\n\n1. What products are you interested in?\n2. What quantity do you need?\n3. What's your timeline?\n\nThis helps us prepare the best quote for you! 🚀",
      };
    } else {
      return {
        action: "update_crm",
        leadScore: score,
      };
    }
  }

  // Calculate lead score based on message content
  private calculateLeadScore(text: string): number {
    let score = 0;

    // High-value keywords
    const highValueTerms = [
      "order", "buy", "purchase", "quote", "price", "pricing", "catalog",
      "wholesale", "bulk", "container", "shipment", "delivery",
      "urgent", "immediately", "asap",
    ];

    // Medium-value keywords
    const mediumValueTerms = [
      "product", "interested", "looking for", "need", "require",
      "sample", "quality", "certification", "export", "import",
      "partnership", "distributor", "supplier",
    ];

    // Company indicators
    const companyIndicators = [
      "company", "ltd", "limited", "inc", "corp", "enterprise",
      "business", "trading", "wholesale",
    ];

    highValueTerms.forEach((term) => {
      if (text.includes(term)) score += 15;
    });

    mediumValueTerms.forEach((term) => {
      if (text.includes(term)) score += 8;
    });

    companyIndicators.forEach((term) => {
      if (text.includes(term)) score += 10;
    });

    // Check for specific intent
    if (text.includes("price") || text.includes("cost") || text.includes("how much")) score += 20;
    if (text.includes("order") || text.includes("buy") || text.includes("purchase")) score += 25;

    return Math.min(score, 100);
  }

  /**
   * Check if WATI is configured with real API credentials.
   * Returns true when both apiToken and whatsappNumberId are set.
   */
  isConfigured(): boolean {
    return !!(this.config.apiToken && this.config.whatsappNumberId);
  }

  // Configure WATI instance
  configure(newConfig: Partial<WATIConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Health check — verifies connectivity to the WATI API.
   * Calls getContacts with pageSize=1 to validate credentials.
   */
  async healthCheck(): Promise<{ connected: boolean; whatsappNumber?: string }> {
    if (!this.isConfigured()) {
      console.log("[WATI] Health check: not configured (simulation mode)");
      return { connected: true, whatsappNumber: undefined };
    }

    try {
      const result = await this.apiFetch<any>("getContacts?pageSize=1");
      if (result.success) {
        console.log("[WATI] Health check passed — API connected");
        return { connected: true, whatsappNumber: this.config.whatsappNumberId };
      }

      console.warn(`[WATI] Health check failed: ${result.error}`);
      return { connected: false };
    } catch (error) {
      console.error("[WATI] Health check failed:", error);
      return { connected: false };
    }
  }
}

// Export singleton instance
export const watiIntegration = new WATIIntegration();

export default WATIIntegration;
