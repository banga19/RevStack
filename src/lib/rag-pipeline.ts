import { Document } from "@langchain/core/documents";
import { TextSplitter } from "@langchain/textsplitters";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { UnstructuredLoader } from "@langchain/community/document_loaders/fs/unstructured";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { JSONLoader } from "@langchain/classic/document_loaders/fs/json";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import langchainService from "./langchain-service";

// RAG Pipeline Configuration
export interface RAGConfig {
  chunkSize: number;
  chunkOverlap: number;
  retrievalK: number;
  similarityThreshold: number;
}

// Default RAG configuration
export const DEFAULT_RAG_CONFIG: RAGConfig = {
  chunkSize: 1000,
  chunkOverlap: 200,
  retrievalK: 4,
  similarityThreshold: 0.7,
};

// Document processing result
export interface ProcessedDocument {
  id: string;
  content: string;
  metadata: Record<string, any>;
  chunks: Document[];
  processedAt: Date;
}

// RAG Pipeline Class
export class RAGPipeline {
  private vectorStore: MemoryVectorStore;
  private textSplitter: TextSplitter;
  private config: RAGConfig;
  private processedDocs: Map<string, ProcessedDocument>;

  constructor(config: RAGConfig = DEFAULT_RAG_CONFIG) {
    this.config = config;
    this.vectorStore = new MemoryVectorStore(langchainService.embeddings);
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: config.chunkSize,
      chunkOverlap: config.chunkOverlap,
    });
    this.processedDocs = new Map();
  }

  // Load document from various sources
  async loadDocument(source: string | Buffer, options: { type: string } = { type: "text" }): Promise<Document[]> {
    let loader;

    switch (options.type.toLowerCase()) {
        case "pdf":
            loader = new PDFLoader(source as string);
            break;
        case "docx":
            loader = new DocxLoader(source as string);
            break;
        case "md":
        case "markdown":
            loader = new UnstructuredLoader(source as string);
            break;
        case "csv":
            loader = new CSVLoader(source as string);
            break;
        case "json":
            loader = new JSONLoader(source as string);
            break;
        case "url":
            loader = new CheerioWebBaseLoader(source as string);
            break;
        case "text":
        default:
            loader = new TextLoader(source as string);
            break;
    }

    return await loader.load();
  }

  // Process and chunk document
  async processDocument(
    source: string | Buffer,
    metadata: Record<string, any> = {},
    options: { type?: string } = {}
  ): Promise<ProcessedDocument> {
    const docId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Load raw document
    const docs = await this.loadDocument(source, { type: options.type || "text" });

    // Combine content
    const fullContent = docs.map(doc => doc.pageContent).join("\n\n");

    // Split into chunks
    const chunks = await this.textSplitter.splitDocuments(docs);

    // Add metadata to chunks
    const enrichedChunks = chunks.map(chunk => {
      return new Document({
        pageContent: chunk.pageContent,
        metadata: {
          ...chunk.metadata,
          ...metadata,
          documentId: docId,
          chunkIndex: chunks.indexOf(chunk),
        }
      });
    });

    // Store processed document
    const processedDoc: ProcessedDocument = {
      id: docId,
      content: fullContent,
      metadata,
      chunks: enrichedChunks,
      processedAt: new Date(),
    };

    this.processedDocs.set(docId, processedDoc);

    // Add to vector store
    await this.vectorStore.addDocuments(enrichedChunks);

    return processedDoc;
  }

  // Search for relevant documents
  async searchDocuments(
    query: string,
    options: { k?: number; filter?: Record<string, any> } = {}
  ): Promise<Document[]> {
    const k = options.k ?? this.config.retrievalK;

    if (options.filter) {
      // Filtered search (simplified - in production would use proper filtering)
      const allResults = await this.vectorStore.similaritySearch(query, k * 2); // Get more to filter
      // Simple filtering - real implementation would be more sophisticated
      const filtered = allResults.filter(doc => {
        return Object.entries(options.filter || {}).every(([key, value]) =>
          doc.metadata[key] === value
        );
      });
      return filtered.slice(0, k);
    } else {
      return await this.vectorStore.similaritySearch(query, k);
    }
  }

  // Generate response using RAG
  async generateResponse(
    query: string,
    options: {
      systemPrompt?: string;
      k?: number;
      includeSources?: boolean
    } = {}
  ): Promise<{
    response: string;
    sources?: Document[];
  }> {
    const systemPrompt = options.systemPrompt ??
      "You are a helpful assistant that answers questions based on the provided context. " +
      "If you don't know the answer from the context, say so clearly.";

    const k = options.k ?? this.config.retrievalK;

    // Retrieve relevant documents
    const sources = await this.searchDocuments(query, { k });

    if (sources.length === 0) {
      // No relevant documents found
      const prompt = ChatPromptTemplate.fromMessages([
        ["system", systemPrompt],
        ["human", "Question: {question}\n\nNo relevant context found in knowledge base."],
      ]);

      const chain = prompt.pipe(langchainService.llm).pipe(new StringOutputParser());
      const response = await chain.invoke({ question: query });

      return { response };
    }

    // Prepare context from sources
    const context = sources.map((doc, index) =>
      `Source [${index + 1}]:${doc.pageContent}`
    ).join("\n\n");

    // Generate response with context
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemPrompt],
      ["human", "Context:\n{context}\n\nQuestion: {question}\n\nAnswer based on the provided context."],
    ]);

    const chain = prompt.pipe(langchainService.llm).pipe(new StringOutputParser());
    const response = await chain.invoke({
      context,
      question: query
    });

    return {
      response,
      sources: options.includeSources ? sources : undefined,
    };
  }

  // Get all processed documents
  getProcessedDocuments(): ProcessedDocument[] {
    return Array.from(this.processedDocs.values());
  }

  // Clear all documents
  clearDocuments(): void {
    this.processedDocs.clear();
    // Note: In production, we'd need to rebuild the vector store
    // For simplicity, we're creating a new one
    this.vectorStore = new MemoryVectorStore(langchainService.embeddings);
  }

  // Get vector store for direct access
  getVectorStore(): MemoryVectorStore {
    return this.vectorStore;
  }
}

// Export singleton instance
export const ragPipeline = new RAGPipeline();

export default RAGPipeline;