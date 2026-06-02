/**
 * QMe Integration Layer
 *
 * QMe is referenced throughout the seed data as a document processing and workflow automation system.
 * This integration layer simulates QMe's capabilities for:
 * - Document intake and processing
 * - Data extraction and classification
 * - Workflow automation triggers
 * - Knowledge base population
 */

import { Document } from "@langchain/core/documents";
import { ragPipeline } from "./rag-pipeline";
import langchainService from "./langchain-service";

// QMe Processing Types
export interface QMeDocument {
  id: string;
  filename: string;
  content: string;
  fileType: string;
  size: number;
  uploadedAt: Date;
  processed: boolean;
  metadata: Record<string, any>;
}

export interface QMeExtractionResult {
  documentId: string;
  extractedEntities: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
  summary: string;
  categories: string[];
  keywords: string[];
  sentiment: "positive" | "negative" | "neutral";
  processingTimeMs: number;
}

export interface QMeWorkflowTrigger {
  triggerId: string;
  documentId?: string;
  workflowName: string;
  conditions: Record<string, any>;
  actions: Array<{
    type: string;
    parameters: Record<string, any>;
  }>;
  activated: boolean;
}

// QMe Service Class
export class QMeIntegration {
  private processedDocuments: Map<string, QMeDocument>;
  private workflowTriggers: Map<string, QMeWorkflowTrigger>;
  private processingQueue: Array<{ documentId: string; priority: number }>;

  constructor() {
    this.processedDocuments = new Map();
    this.workflowTriggers = new Map();
    this.processingQueue = [];

    // Initialize with some default workflow triggers based on seed data
    this.initializeDefaultWorkflows();
  }

  // Initialize default workflows based on seed data references
  private initializeDefaultWorkflows() {
    // QMe referral workflow (from day 50)
    this.addWorkflowTrigger({
      workflowName: "Referral System Automation",
      conditions: {
        documentType: ["referral", "lead", "prospect"],
        contentContains: ["referral", " introduction", "recommendation"]
      },
      actions: [
        {
          type: "tag_document",
          parameters: { tag: "referral-candidate" }
        },
        {
          type: "notify_team",
          parameters: { team: "growth", message: "New referral document detected" }
        },
        {
          type: "create_followup_task",
          parameters: { dueDateOffset: 1, taskType: "followup" }
        }
      ]
    });

    // QMe lead capture workflow (from day 17)
    this.addWorkflowTrigger({
      workflowName: "Lead Capture Automation",
      conditions: {
        documentType: ["form", "application", "inquiry"],
        contentContains: ["email", "phone", "company", "interest"]
      },
      actions: [
        {
          type: "extract_contact_info",
          parameters: {}
        },
        {
          type: "update_crm",
          parameters: { system: "Zoho CRM" }
        },
        {
          type: "trigger_welcome_sequence",
          parameters: { channel: "email" }
        }
      ]
    });

    // QMe compliance workflow
    this.addWorkflowTrigger({
      workflowName: "Compliance Document Review",
      conditions: {
        documentType: ["certificate", "license", "compliance"],
        contentContains: ["HACCP", "ISO", "organic", "halal", "kebs"]
      },
      actions: [
        {
          type: "flag_for_review",
          parameters: { priority: "high" }
        },
        {
          type: "extract_expiry_dates",
          parameters: {}
        },
        {
          type: "update_compliance_tracker",
          parameters: {}
        }
      ]
    });
  }

  // Add a workflow trigger
  addWorkflowTrigger(trigger: Omit<QMeWorkflowTrigger, "triggerId" | "activated">) {
    const triggerWithId: QMeWorkflowTrigger = {
      ...trigger,
      triggerId: `trigger-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      activated: false
    };

    this.workflowTriggers.set(triggerWithId.triggerId, triggerWithId);
    return triggerWithId.triggerId;
  }

  // Process a document through QMe
  async processDocument(
    file: File | Buffer,
    options: {
      extractEntities?: boolean;
      generateSummary?: boolean;
      checkWorkflows?: boolean;
    } = {}
  ): Promise<QMeExtractionResult> {
    const startTime = Date.now();

    // Generate document ID
    const docId = `qme-doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Determine file type (simplified)
    const fileType = this.detectFileType(file);

    // Read file content
    const content = await this.readFileContent(file);

    // Create QMe document record
    const qmeDoc: QMeDocument = {
      id: docId,
      filename: file instanceof File ? file.name : `document-${docId}`,
      content,
      fileType,
      size: content.length,
      uploadedAt: new Date(),
      processed: false,
      metadata: {
        originalName: file instanceof File ? file.name : "unknown",
        processedBy: "QMe-Integration",
        processingVersion: "1.0.0"
      }
    };

    // Store document
    this.processedDocuments.set(docId, qmeDoc);

    // Process with RAG pipeline for knowledge extraction
    await ragPipeline.processDocument(content, {
      documentId: docId,
      source: "qme",
      processedAt: qmeDoc.uploadedAt.toISOString()
    }, {
      type: this.getLoaderType(fileType)
    });

    // Extract entities and insights
    const extractionResult = await this.extractDocumentInsights(qmeDoc, options);

    // Mark as processed
    qmeDoc.processed = true;
    this.processedDocuments.set(docId, qmeDoc);

    // Check for workflow triggers
    if (options.checkWorkflows !== false) {
      await this.checkWorkflowTriggers(qmeDoc);
    }

    extractionResult.processingTimeMs = Date.now() - startTime;
    return extractionResult;
  }

  // Detect file type from file
  private detectFileType(file: File | Buffer): string {
    if (file instanceof File) {
      const name = file.name.toLowerCase();
      if (name.endsWith('.pdf')) return 'pdf';
      if (name.endsWith('.docx') || name.endsWith('.doc')) return 'docx';
      if (name.endsWith('.md') || name.endsWith('.markdown')) return 'markdown';
      if (name.endsWith('.csv')) return 'csv';
      if (name.endsWith('.json')) return 'json';
      if (name.endsWith('.txt')) return 'text';
      return 'unknown';
    }
    // For Buffer, we'd need magic number detection - simplified for now
    return 'unknown';
  }

  // Get appropriate loader type for RAG pipeline
  private getLoaderType(fileType: string): string {
    switch (fileType) {
      case 'pdf': return 'pdf';
      case 'docx': return 'docx';
      case 'markdown':
      case 'md': return 'markdown';
      case 'csv': return 'csv';
      case 'json': return 'json';
      default: return 'text';
    }
  }

  // Read file content
  private async readFileContent(file: File | Buffer): Promise<string> {
    if (file instanceof File) {
      return await file.text();
    }
    // For Buffer, assume UTF-8 text
    return file.toString('utf-8');
  }

  // Extract insights from document
  private async extractDocumentInsights(
    doc: QMeDocument,
    options: { extractEntities?: boolean; generateSummary?: boolean }
  ): Promise<QMeExtractionResult> {
    const startTime = Date.now();

    // Default options
    const extractEntities = options.extractEntities ?? true;
    const generateSummary = options.generateSummary ?? true;

    // Use LangChain to analyze the document
    const analysisPrompt = `
      Analyze the following document and provide:
      1. A concise summary (2-3 sentences)
      2. Key entities mentioned (people, organizations, places, dates, etc.)
      3. Relevant categories/topics
      4. Important keywords
      5. Overall sentiment (positive, negative, neutral)

      Document content:
      ${doc.content.substring(0, 4000)} {/* Limit to prevent token overflow */}
    `;

    const prompt = langchainService.llm.invoke([
      { role: "system", content: "You are QMe, an intelligent document processing system that extracts structured information from documents." },
      { role: "user", content: analysisPrompt }
    ]);

    const response = await prompt;
    const analysisText = response.content?.toString() || "";

    // Parse the response (simplified - in production would use structured output)
    const summary = this.extractSummary(analysisText);
    const entities = extractEntities ? this.extractEntities(analysisText) : [];
    const categories = this.extractCategories(analysisText);
    const keywords = this.extractKeywords(analysisText);
    const sentiment = this.extractSentiment(analysisText);

    return {
      documentId: doc.id,
      extractedEntities: entities,
      summary,
      categories,
      keywords,
      sentiment,
      processingTimeMs: Date.now() - startTime
    };
  }

  // Helper methods for extracting information from analysis
  private extractSummary(text: string): string {
    // Extract summary from analysis text
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    // Look for summary-like content
    for (const line of lines) {
      if (line.toLowerCase().includes('summary') ||
          line.toLowerCase().includes('overview') ||
          line.length > 50 && line.length < 200) {
        return line.replace(/^(summary|overview):/i, '').trim();
      }
    }
    // Fallback: first substantive line
    return lines.find(line => line.length > 20) || "Document processed successfully";
  }

  private extractEntities(text: string): Array<{type: string; value: string; confidence: number}> {
    const entities: Array<{type: string; value: string; confidence: number}> = [];

    // Simple regex-based entity extraction (would be more sophisticated in production)
    const emailMatches = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g) || [];
    emailMatches.forEach(email => {
      entities.push({ type: "EMAIL", value: email, confidence: 0.9 });
    });

    const phoneMatches = text.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g) || [];
    phoneMatches.forEach(phone => {
      entities.push({ type: "PHONE", value: phone, confidence: 0.85 });
    });

    const dateMatches = text.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g) || [];
    dateMatches.forEach(date => {
      entities.push({ type: "DATE", value: date, confidence: 0.8 });
    });

    // Add some mock entities based on common business terms from seed data
    const businessTerms = [
      { term: "Ultimo Trading", type: "COMPANY" },
      { term: "Sokogate", type: "PLATFORM" },
      { term: "QMe", type: "SYSTEM" },
      { term: "Wati.io", type: "TOOL" },
      { term: "Make.com", type: "TOOL" },
      { term: "Voiceflow", type: "TOOL" },
      { term: "Instantly.ai", type: "TOOL" },
      { term: "Zoho CRM", type: "CRM" },
      { term: "HACCP", type: "CERTIFICATION" },
      { term: "organic", type: "CERTIFICATION" },
      { term: "halal", type: "CERTIFICATION" },
      { term: "KEBS", type: "AUTHORITY" }
    ];

    businessTerms.forEach(termObj => {
      if (text.toLowerCase().includes(termObj.term.toLowerCase())) {
        entities.push({
          type: termObj.type,
          value: termObj.term,
          confidence: 0.75
        });
      }
    });

    return entities;
  }

  private extractCategories(text: string): string[] {
    const categories: string[] = [];
    const categoryMap: Record<string, string[]> = {
      "lead-generation": ["lead", "prospect", "inquiry", "potential client"],
      "compliance": ["compliance", "certification", "HACCP", "ISO", "audit", "regulation"],
      "marketing": ["marketing", "campaign", "outreach", "promotion", "advertising"],
      "sales": ["sale", "revenue", "profit", "deal", "pipeline", "quotation"],
      "operations": ["operation", "process", "workflow", "automation", "efficiency"],
      "finance": ["finance", "budget", "cost", "expense", "invoice", "payment"],
      "hr": ["hr", "human resources", "employee", "staff", "hiring", "recruitment"],
      "legal": ["legal", "contract", "agreement", "terms", "liability", "intellectual property"]
    };

    const lowerText = text.toLowerCase();
    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        categories.push(category);
      }
    }
    return categories;
  }

  private extractKeywords(text: string): string[] {
    // Extract important keywords (simplified implementation)
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'].includes(word));

    // Count word frequency
    const wordCount: Record<string, number> = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    // Return top 10 keywords
    return Object.entries(wordCount)
      .sort(([,a], [,b]: [string, number]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  private extractSentiment(text: string): "positive" | "negative" | "neutral" {
    const positiveWords = ['good', 'great', 'excellent', 'positive', 'success', 'win', 'profit', 'growth', 'increase', 'improve', 'better', 'best', 'happy', 'satisfied'];
    const negativeWords = ['bad', 'poor', 'negative', 'loss', 'lose', 'decrease', 'decline', 'problem', 'issue', 'risk', 'concern', 'worried', 'unhappy', 'disappointed'];

    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;

    if (positiveCount > negativeCount) return "positive";
    if (negativeCount > positiveCount) return "negative";
    return "neutral";
  }

  // Check workflow triggers for a document
  private async checkWorkflowTriggers(doc: QMeDocument): Promise<void> {
    for (const [triggerId, trigger] of this.workflowTriggers.entries()) {
      if (this.evaluateTriggerConditions(trigger, doc)) {
        await this.executeWorkflowActions(trigger, doc);
        // Mark trigger as activated (in a real system, this might be more complex)
        const updatedTrigger = { ...trigger, activated: true };
        this.workflowTriggers.set(triggerId, updatedTrigger);
      }
    }
  }

  // Evaluate if trigger conditions are met
  private evaluateTriggerConditions(trigger: QMeWorkflowTrigger, doc: QMeDocument): boolean {
    return trigger.conditions.documentType.some((type: string) =>
      doc.fileType.toLowerCase().includes(type.toLowerCase()) ||
      doc.filename.toLowerCase().includes(type.toLowerCase())
    ) && trigger.conditions.contentContains.some((condition: string) =>
      doc.content.toLowerCase().includes(condition.toLowerCase())
    );
  }

  // Execute workflow actions
  private async executeWorkflowActions(trigger: QMeWorkflowTrigger, doc: QMeDocument): Promise<void> {
    console.log(`QMe Workflow Triggered: ${trigger.workflowName} for document ${doc.filename}`);

    for (const action of trigger.actions) {
      console.log(`  Executing action: ${action.type}`);
      // In a real implementation, these would perform actual actions
      // For now, we'll simulate with console logs
      switch (action.type) {
        case "tag_document":
          console.log(`    Tagging document with: ${action.parameters.tag}`);
          break;
        case "notify_team":
          console.log(`    Notifying ${action.parameters.team}: ${action.parameters.message}`);
          break;
        case "create_followup_task":
          console.log(`    Creating followup task: ${action.parameters.taskType} due in ${action.parameters.dueDateOffset} day(s)`);
          break;
        case "extract_contact_info":
          console.log(`    Extracting contact information from document`);
          break;
        case "update_crm":
          console.log(`    Updating ${action.parameters.system} with document data`);
          break;
        case "trigger_welcome_sequence":
          console.log(`    Triggering welcome sequence via ${action.parameters.channel}`);
          break;
        case "flag_for_review":
          console.log(`    Flagging document for review with priority: ${action.parameters.priority}`);
          break;
        case "extract_expiry_dates":
          console.log(`    Extracting expiry dates from compliance document`);
          break;
        case "update_compliance_tracker":
          console.log(`    Updating compliance tracker with document information`);
          break;
        default:
          console.log(`    Executing unknown action: ${action.type}`);
      }
    }
  }

  // Get processed document
  getProcessedDocument(documentId: string): QMeDocument | undefined {
    return this.processedDocuments.get(documentId);
  }

  // Get all processed documents
  getAllProcessedDocuments(): QMeDocument[] {
    return Array.from(this.processedDocuments.values());
  }

  // Get workflow triggers
  getWorkflowTriggers(): QMeWorkflowTrigger[] {
    return Array.from(this.workflowTriggers.values());
  }

  // Clear all data
  clearAll(): void {
    this.processedDocuments.clear();
    this.workflowTriggers.clear();
    this.processingQueue = [];
    // Reinitialize default workflows
    this.initializeDefaultWorkflows();
  }
}

// Export singleton instance
export const qmeIntegration = new QMeIntegration();

export default QMeIntegration;