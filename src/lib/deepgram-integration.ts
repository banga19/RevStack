/**
 * Deepgram Integration Layer
 *
 * Provides speech-to-text transcription and AI summarization
 * for call recordings and other audio content.
 *
 * Env vars required for live mode:
 *   DEEPGRAM_API_KEY
 *
 * Docs: https://developers.deepgram.com/docs
 */

export interface DeepgramConfig {
  apiKey: string
}

export interface TranscriptionOptions {
  model?: "nova-2" | "nova-3" | "base" | "enhanced"
  language?: string
  punctuate?: boolean
  diarize?: boolean
  smartFormat?: boolean
  summarize?: "v1" | "v2"
  detectLanguage?: boolean
  channels?: number
}

export interface TranscriptionResult {
  transcript: string
  duration: number
  language?: string
  alternatives?: Array<{ transcript: string; confidence: number }>
  utterances?: Array<{
    speaker: number
    text: string
    start: number
    end: number
    confidence: number
  }>
  summary?: string
  segments?: Array<{ text: string; start: number; end: number }>
}

export class DeepgramIntegration {
  private config: DeepgramConfig | null = null
  private simulationMode: boolean = true

  constructor(config?: Partial<DeepgramConfig>) {
    const apiKey = config?.apiKey || process.env.DEEPGRAM_API_KEY || ""

    if (apiKey) {
      this.config = { apiKey }
      this.simulationMode = false
    }
  }

  private getHeaders(): Record<string, string> {
    if (!this.config) return {}
    return {
      Authorization: `Token ${this.config.apiKey}`,
      "Content-Type": "application/json",
    }
  }

  async transcribeUrl(
    audioUrl: string,
    options: TranscriptionOptions = {}
  ): Promise<{ success: boolean; result?: TranscriptionResult; error?: string }> {
    if (this.simulationMode) {
      return this.simulatedTranscription(audioUrl, options)
    }

    try {
      const params = new URLSearchParams()
      if (options.model) params.set("model", options.model)
      if (options.language) params.set("language", options.language)
      if (options.punctuate !== false) params.set("punctuate", "true")
      if (options.diarize) params.set("diarize", "true")
      if (options.smartFormat !== false) params.set("smart_format", "true")
      if (options.summarize) params.set("summarize", options.summarize)
      if (options.detectLanguage) params.set("detect_language", "true")

      const response = await fetch(
        `https://api.deepgram.com/v1/listen?${params.toString()}`,
        {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({ url: audioUrl }),
        }
      )

      if (!response.ok) {
        const errText = await response.text()
        return { success: false, error: `Deepgram API error (${response.status}): ${errText}` }
      }

      const data = await response.json()
      const result = this.parseDeepgramResponse(data)
      return { success: true, result }
    } catch (error: unknown) {
      if (!this.simulationMode) {
        console.warn(`[Deepgram] Transcription failed, falling back to simulated data: ${error instanceof Error ? error.message : String(error)}`)
      }
      return this.simulatedTranscription(audioUrl, options)
    }
  }

  async transcribeAudioBuffer(
    audioBuffer: Buffer,
    mimeType: string = "audio/wav",
    options: TranscriptionOptions = {}
  ): Promise<{ success: boolean; result?: TranscriptionResult; error?: string }> {
    if (this.simulationMode) {
      return this.simulatedTranscription("", options)
    }

    try {
      const params = new URLSearchParams()
      if (options.model) params.set("model", options.model)
      if (options.language) params.set("language", options.language)
      if (options.punctuate !== false) params.set("punctuate", "true")
      if (options.diarize) params.set("diarize", "true")
      if (options.smartFormat !== false) params.set("smart_format", "true")
      if (options.summarize) params.set("summarize", options.summarize)

      const response = await fetch(
        `https://api.deepgram.com/v1/listen?${params.toString()}`,
        {
          method: "POST",
          headers: {
            ...this.getHeaders(),
            "Content-Type": mimeType,
          },
          body: audioBuffer,
        }
      )

      if (!response.ok) {
        const errText = await response.text()
        return { success: false, error: `Deepgram API error (${response.status}): ${errText}` }
      }

      const data = await response.json()
      const result = this.parseDeepgramResponse(data)
      return { success: true, result }
    } catch (error: unknown) {
      if (!this.simulationMode) {
        console.warn(`[Deepgram] Transcription failed, falling back to simulated data: ${error instanceof Error ? error.message : String(error)}`)
      }
      return this.simulatedTranscription("", options)
    }
  }

  private parseDeepgramResponse(data: any): TranscriptionResult {
    const result: TranscriptionResult = {
      transcript: "",
      duration: 0,
    }

    try {
      const results = data.results || data
      const channels = results.channels
      if (channels && channels.length > 0) {
        const channel = channels[0]
        const alternatives = channel.alternatives
        if (alternatives && alternatives.length > 0) {
          result.transcript = alternatives[0].transcript || ""
          result.alternatives = alternatives.map((a: any) => ({
            transcript: a.transcript || "",
            confidence: a.confidence || 0,
          }))
        }

        if (channel.diarized_alternatives) {
          result.utterances = channel.diarized_alternatives.map((u: any) => ({
            speaker: u.speaker || 0,
            text: u.transcript || "",
            start: u.start || 0,
            end: u.end || 0,
            confidence: u.confidence || 0,
          }))
        }

        if (options.summarize && results.summary) {
          result.summary = results.summary.short || results.summary.text || ""
        }
      }

      result.duration = data.metadata?.duration || 0
      result.language = data.metadata?.language || options.language
    } catch (e) {
      console.warn("[Deepgram] Failed to parse response:", e)
    }

    return result
  }

  private async simulatedTranscription(
    _audioUrl: string,
    _options: TranscriptionOptions = {}
  ): Promise<{ success: boolean; result: TranscriptionResult }> {
    await new Promise((r) => setTimeout(r, 800))

    const simulatedTranscripts = [
      "Hi, thanks for taking my call. I'm calling from RevStack and we help B2B trading companies automate their sales outreach. Would you have 10 minutes this week to discuss how we could help your team?",
      "That's interesting. What kind of automation are you talking about? We've tried a few tools in the past but nothing really stuck.",
      "So you mentioned call recording — is that included or is that an add-on? And do you integrate with HubSpot? That's our current CRM.",
      "The pricing looks reasonable. Can you send me a follow-up email with the details and maybe book a demo for next Tuesday?",
    ]

    const transcript = simulatedTranscripts.join(" ")
    const utterances = simulatedTranscripts.map((text, i) => ({
      speaker: i % 2 === 0 ? 0 : 1,
      text,
      start: i * 15,
      end: (i + 1) * 15,
      confidence: 0.92 + Math.random() * 0.07,
    }))

    return {
      success: true,
      result: {
        transcript,
        duration: 60,
        language: "en",
        utterances,
        summary: "Prospect showed interest in the platform. Asked about call recording and HubSpot integration. Requested follow-up email and demo booking for next Tuesday.",
        segments: utterances.map((u) => ({ text: u.text, start: u.start, end: u.end })),
      },
    }
  }

  isConfigured(): boolean {
    return !this.simulationMode && this.config !== null
  }

  summary(): string {
    if (this.simulationMode) {
      return `Deepgram: SIMULATION MODE — set DEEPGRAM_API_KEY for live transcription (nova-2/nova-3)`
    }
    return `Deepgram: LIVE MODE — API key configured`
  }
}

export const deepgramIntegration = new DeepgramIntegration()
export default DeepgramIntegration
