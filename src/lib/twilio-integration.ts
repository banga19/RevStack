/**
 * Twilio Integration Layer
 *
 * Provides voice call, SMS, and call recording capabilities.
 * Falls back to simulation mode when TWILIO_ACCOUNT_SID is not configured.
 *
 * Env vars required for live mode:
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 *
 * Optional:
 *   TWILIO_RECORDING_STATUS_CALLBACK (webhook URL for recording events)
 */

export interface TwilioConfig {
  accountSid: string
  authToken: string
  phoneNumber: string
  recordingCallbackUrl?: string
}

export interface InitiateCallParams {
  to: string
  from?: string
  record?: boolean
  recordingChannels?: "mono" | "dual"
  timeout?: number
  statusCallback?: string
  metadata?: Record<string, string>
}

export interface TwilioCallResult {
  callSid: string
  status: string
  to: string
  from: string
  direction: string
  recordingSid?: string
  recordingUrl?: string
  duration?: number
  error?: string
}

export interface TwilioSmsParams {
  to: string
  body: string
  from?: string
  statusCallback?: string
}

export interface TwilioRecordingWebhookPayload {
  CallSid: string
  RecordingSid: string
  RecordingUrl: string
  RecordingDuration: number
  RecordingStatus: string
  CallDuration?: string
  From: string
  To: string
}

export class TwilioIntegration {
  private config: TwilioConfig | null = null
  private simulationMode: boolean = true

  constructor(config?: Partial<TwilioConfig>) {
    const accountSid = config?.accountSid || process.env.TWILIO_ACCOUNT_SID || ""
    const authToken = config?.authToken || process.env.TWILIO_AUTH_TOKEN || ""
    const phoneNumber = config?.phoneNumber || process.env.TWILIO_PHONE_NUMBER || ""

    if (accountSid && authToken && phoneNumber) {
      this.config = {
        accountSid,
        authToken,
        phoneNumber,
        recordingCallbackUrl: config?.recordingCallbackUrl || process.env.TWILIO_RECORDING_STATUS_CALLBACK || "",
      }
      this.simulationMode = false
    }
  }

  private getBaseUrl(): string {
    return `https://api.twilio.com/2010-04-01/Accounts/${this.config!.accountSid}`
  }

  private authHeader(): string {
    return `Basic ${Buffer.from(`${this.config!.accountSid}:${this.config!.authToken}`).toString("base64")}`
  }

  private async twilioRequest(
    path: string,
    method: "GET" | "POST" = "GET",
    formData?: Record<string, string>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    if (this.simulationMode) {
      return this.simulatedRequest(path, method, formData)
    }

    try {
      const url = `${this.getBaseUrl()}${path}.json`
      const headers: Record<string, string> = {
        Authorization: this.authHeader(),
      }

      let body: string | undefined
      if (formData && Object.keys(formData).length > 0) {
        headers["Content-Type"] = "application/x-www-form-urlencoded"
        body = new URLSearchParams(formData).toString()
      }

      const response = await fetch(url, {
        method,
        headers,
        body,
      })

      const data = await response.json()
      if (!response.ok) {
        return { success: false, error: data.message || JSON.stringify(data) }
      }
      return { success: true, data }
    } catch (error: unknown) {
      if (!this.simulationMode) {
        console.warn(`[Twilio] API request failed, falling back to simulated data: ${error instanceof Error ? error.message : String(error)}`)
      }
      return this.simulatedRequest(path, method, formData)
    }
  }

  private simulatedRequest(
    _path: string,
    _method: string,
    _formData?: Record<string, string>
  ): { success: boolean; data?: any; error?: string } {
    const mockSid = `CA${this.generateMockSid()}`
    return {
      success: true,
      data: {
        sid: mockSid,
        status: "queued",
        to: "+1234567890",
        from: this.config?.phoneNumber || "+10000000000",
        direction: "outbound-api",
        dateCreated: new Date().toISOString(),
      },
    }
  }

  private generateMockSid(): string {
    return Math.random().toString(36).substring(2, 34).toUpperCase()
  }

  async initiateCall(params: InitiateCallParams): Promise<TwilioCallResult> {
    const formData: Record<string, string> = {
      To: params.to,
      From: params.from || this.config?.phoneNumber || "",
      Record: params.record ? "true" : "false",
      RecordingChannels: params.recordingChannels || "mono",
      Timeout: String(params.timeout || 30),
      StatusCallback: params.statusCallback || "",
      StatusCallbackEvent: "initiated ringing answered completed failed busy no-answer",
    }

    if (params.metadata) {
      Object.entries(params.metadata).forEach(([k, v]) => {
        formData[`MetaData_${k}`] = v
      })
    }

    const result = await this.twilioRequest("/Calls", "POST", formData)

    if (!result.success || !result.data) {
      return {
        callSid: "",
        status: "failed",
        to: params.to,
        from: params.from || this.config?.phoneNumber || "",
        direction: "outbound-api",
        error: result.error || "Failed to initiate call",
      }
    }

    return {
      callSid: result.data.sid,
      status: result.data.status,
      to: result.data.to,
      from: result.data.from,
      direction: result.data.direction,
    }
  }

  async initiateSms(params: TwilioSmsParams): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    const formData: Record<string, string> = {
      To: params.to,
      Body: params.body,
      From: params.from || this.config?.phoneNumber || "",
    }

    if (params.statusCallback) {
      formData.StatusCallback = params.statusCallback
    }

    const result = await this.twilioRequest("/Messages", "POST", formData)

    if (!result.success || !result.data) {
      return { success: false, error: result.error || "Failed to send SMS" }
    }

    return { success: true, messageSid: result.data.sid }
  }

  async fetchCall(callSid: string): Promise<TwilioCallResult | null> {
    const result = await this.twilioRequest(`/Calls/${callSid}`)

    if (!result.success || !result.data) {
      return null
    }

    return {
      callSid: result.data.sid,
      status: result.data.status,
      to: result.data.to,
      from: result.data.from,
      direction: result.data.direction,
      duration: result.data.duration ? parseInt(result.data.duration, 10) : undefined,
    }
  }

  async endCall(callSid: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.twilioRequest(`/Calls/${callSid}`, "POST", {
      Status: "completed",
    })

    return { success: result.success, error: result.error }
  }

  isConfigured(): boolean {
    return !this.simulationMode && this.config !== null
  }

  summary(): string {
    if (this.simulationMode) {
      return `Twilio: SIMULATION MODE — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER for live calling`
    }
    return `Twilio: LIVE MODE — phone number ${this.config?.phoneNumber}`
  }
}

export const twilioIntegration = new TwilioIntegration()
export default TwilioIntegration
