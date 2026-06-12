/**
 * Model Provider — Multi-LLM Configuration
 *
 * Supports switching between LLM providers via environment variables.
 * Priority order (free → affordable → paid):
 *   1. NVIDIA NIM  (NVIDIA_NIM_API_KEY)  — free API via nvidia.com
 *   2. Gemini       (GEMINI_API_KEY)      — free tier via Google
 *   3. DeepSeek     (DEEPSEEK_API_KEY)    — affordable API via deepseek.com
 *   4. OpenAI       (OPENAI_API_KEY)      — GPT-4o (paid fallback)
 *
 * All providers use the OpenAI-compatible ChatOpenAI interface from LangChain,
 * so swapping is transparent to the rest of the codebase.
 *
 * Provider details:
 *   nvidia_nim: https://integrate.api.nvidia.com/v1,      model: nvidia/nemotron-3-super-120b-a12b
 *   gemini:     https://generativelanguage.googleapis.com/v1beta/openai/, model: gemini-2.0-flash
 *   deepseek:   https://api.deepseek.com/v1,               model: deepseek-chat
 *   openai:     https://api.openai.com/v1,                 model: gpt-4o
 */

import { ChatOpenAI } from "@langchain/openai"
import { OpenAIEmbeddings } from "@langchain/openai"

// ── Provider Types ────────────────────────────────────────────────

export type ModelProvider = "nvidia_nim" | "gemini" | "deepseek" | "openai"

interface ProviderConfig {
  name: string
  envVar: string
  baseUrl: string
  defaultModel: string
  available: boolean
}

// ── Provider Registry ─────────────────────────────────────────────

const PROVIDERS: Record<ModelProvider, ProviderConfig> = {
  nvidia_nim: {
    name: "NVIDIA NIM",
    envVar: "NVIDIA_NIM_API_KEY",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    defaultModel: "nvidia/nemotron-3-super-120b-a12b",
    available: false,
  },
  gemini: {
    name: "Gemini",
    envVar: "GEMINI_API_KEY",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    defaultModel: "gemini-2.0-flash",
    available: false,
  },
  deepseek: {
    name: "DeepSeek",
    envVar: "DEEPSEEK_API_KEY",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    available: false,
  },
  openai: {
    name: "OpenAI",
    envVar: "OPENAI_API_KEY",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
    available: false,
  },
}

// ── Detection ─────────────────────────────────────────────────────

function checkProviders(): void {
  for (const provider of Object.values(PROVIDERS)) {
    provider.available = !!process.env[provider.envVar]
  }
}

// Initialize on module load
checkProviders()

// ── Provider Selection ────────────────────────────────────────────

export function getActiveProvider(): { id: ModelProvider; config: ProviderConfig } {
  // Priority: NVIDIA NIM (free) → Gemini (free) → DeepSeek (affordable) → OpenAI (paid fallback)
  const priority: ModelProvider[] = ["nvidia_nim", "gemini", "deepseek", "openai"]

  for (const id of priority) {
    if (PROVIDERS[id].available) {
      return { id, config: PROVIDERS[id] }
    }
  }

  // No provider configured — fall back to openai (will fail gracefully if no key)
  return { id: "openai", config: PROVIDERS.openai }
}

// ── LLM Factory ───────────────────────────────────────────────────

export interface LlmOptions {
  temperature?: number
  modelName?: string
}

/**
 * Creates a ChatOpenAI instance configured for the active provider.
 * Since all providers (NVIDIA NIM, Gemini, OpenAI) use OpenAI-compatible APIs,
 * we reuse ChatOpenAI with the appropriate base URL and model name.
 */
export function createLlm(options: LlmOptions = {}): ChatOpenAI {
  const { config } = getActiveProvider()
  const apiKey = process.env[config.envVar] || ""

  const llm = new ChatOpenAI({
    modelName: options.modelName || config.defaultModel,
    temperature: options.temperature ?? 0.7,
    maxRetries: 2,
    configuration: {
      baseURL: config.baseUrl,
    },
    apiKey,
  })

  return llm
}

/**
 * Creates a ChatOpenAI instance specifically for planning/analysis
 * (lower temperature for more deterministic outputs).
 */
export function createPlannerLlm(): ChatOpenAI {
  return createLlm({ temperature: 0.4 })
}

/**
 * Creates a ChatOpenAI instance for agent actions
 * (moderate temperature for balanced creativity/reliability).
 */
export function createAnalystLlm(): ChatOpenAI {
  return createLlm({ temperature: 0.2 })
}

// ── Embeddings ────────────────────────────────────────────────────

/**
 * Creates embeddings instance.
 * Falls back to OpenAI embeddings regardless of the active provider,
 * since NVIDIA NIM and Gemini rely on OpenAI-compatible chat APIs
 * but may not support embeddings in the same way.
 */
export function createEmbeddings(): OpenAIEmbeddings {
  // Always use OpenAI embeddings when available
  if (process.env.OPENAI_API_KEY) {
    return new OpenAIEmbeddings()
  }

  // For Gemini, embeddings are handled separately
  if (process.env.GEMINI_API_KEY) {
    return new OpenAIEmbeddings({
      modelName: "text-embedding-004",
      configuration: {
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      },
    })
  }

  // Fallback — will fail if no key is set
  return new OpenAIEmbeddings()
}

// ── Summary ───────────────────────────────────────────────────────

export function getProviderSummary(): string {
  const { id, config } = getActiveProvider()
  const available = Object.values(PROVIDERS)
    .filter((p) => p.available)
    .map((p) => p.name)
    .join(", ")

  return [
    `Active provider: ${config.name} (${id})`,
    `Model: ${config.defaultModel}`,
    `Available providers: ${available || "None"}`,
    `Set one of: ${Object.values(PROVIDERS)
      .map((p) => p.envVar)
      .join(", ")}`,
  ].join("\n")
}

const modelProvider = {
  createLlm,
  createPlannerLlm,
  createAnalystLlm,
  createEmbeddings,
  getActiveProvider,
  getProviderSummary,
}
export default modelProvider
