import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Annotation, StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import { createLlm, createEmbeddings } from "./model-provider";

// Initialize LLM
const llm = createLlm({ temperature: 0.7 });

// Initialize embeddings
const embeddings = createEmbeddings();

// Initialize vector store for RAG
const vectorStore = new MemoryVectorStore(embeddings);

// Button action schema
const ButtonActionSchema = z.object({
  actionType: z.enum(["navigate", "submit", "toggle", "openModal", "processData"]),
  target: z.string(),
  parameters: z.record(z.string(), z.any()).optional(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export type ButtonAction = z.infer<typeof ButtonActionSchema>;

// Define the state using Annotation.Root (LangGraph v1.3.x API)
const ButtonState = Annotation.Root({
  lastAction: Annotation<ButtonAction | null>,
  actionHistory: Annotation<ButtonAction[]>,
  context: Annotation<Record<string, any>>,
  isProcessing: Annotation<boolean>,
});

// Function to analyze context and determine button action
const analyzeContext = async (state: Record<string, any>) => {
  const analysisPrompt = ChatPromptTemplate.fromMessages([
    ["system", "You are an expert at analyzing UI context and determining the most appropriate button action. Consider the current state, user intent, and available options."],
    ["human", "Current context: {context}\n\nBased on this context, determine the best button action to take. Available actions: navigate, submit, toggle, openModal, processData."],
  ]);

  const analysisChain = analysisPrompt.pipe(llm).pipe(new StringOutputParser());
  const reasoning = await analysisChain.invoke({ context: JSON.stringify(state.context) });

  const action: ButtonAction = {
    actionType: "navigate",
    target: "/dashboard",
    parameters: {},
    confidence: 0.8,
    reasoning: reasoning.substring(0, 200),
  };

  return {
    ...state,
    lastAction: action,
    actionHistory: [...state.actionHistory, action],
    isProcessing: false,
  };
};

// Create the button workflow graph
const createButtonWorkflow = () => {
  const workflow = new StateGraph(ButtonState)
    .addNode("analyzeContext", analyzeContext)
    .addEdge("__start__", "analyzeContext")
    .addEdge("analyzeContext", "__end__");

  return workflow.compile();
};

// Global workflow instance
let buttonWorkflow: ReturnType<typeof createButtonWorkflow> | null = null;

// Initialize the workflow
export const initializeButtonWorkflow = () => {
  if (!buttonWorkflow) {
    buttonWorkflow = createButtonWorkflow();
  }
  return buttonWorkflow;
};

// Get button action based on context
export const getButtonAction = async (
  context: Record<string, any>
): Promise<ButtonAction> => {
  const workflow = initializeButtonWorkflow();

  const result = await workflow.invoke({
    lastAction: null,
    actionHistory: [],
    context,
    isProcessing: true,
  });

  return result.lastAction || {
    actionType: "navigate",
    target: "/",
    parameters: {},
    confidence: 0.5,
    reasoning: "Default fallback action",
  };
};

// Add document to vector store for RAG
export const addDocumentToKnowledgeBase = async (
  content: string,
  metadata: Record<string, any> = {}
) => {
  await vectorStore.addDocuments([
    {
      pageContent: content,
      metadata,
    }
  ]);
};

// Search knowledge base for relevant context
export const searchKnowledgeBase = async (
  query: string,
  k: number = 3
) => {
  return await vectorStore.similaritySearch(query, k);
};

// Enhanced button action with RAG context
export const getEnhancedButtonAction = async (
  baseContext: Record<string, any>,
  queryContext: string = ""
): Promise<ButtonAction> => {
  // Get relevant documents from knowledge base
  const relevantDocs = queryContext
    ? await searchKnowledgeBase(queryContext)
    : [];

  // Enhance context with retrieved information
  const enhancedContext = {
    ...baseContext,
    retrievedKnowledge: relevantDocs.map(doc => ({
      content: doc.pageContent.substring(0, 500),
      metadata: doc.metadata,
    })),
  };

  // Get button action with enhanced context
  return await getButtonAction(enhancedContext);
};

const langchainService = {
  initializeButtonWorkflow,
  getButtonAction,
  getEnhancedButtonAction,
  addDocumentToKnowledgeBase,
  searchKnowledgeBase,
  llm,
  embeddings,
  vectorStore,
};
export default langchainService;
