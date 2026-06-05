import { describe, it, expect } from "vitest"

/**
 * Hermes run task execution logic — mirrors the task type processing
 * in src/app/api/hermes/runs/route.ts for unit testing.
 */
type HermesTask = "qualify_leads" | "send_followups" | "onboard_clients" | "generate_report" | "custom"

interface HermesResult {
  output: string
  leadsProcessed: number
  messagesQueued: number
}

function simulateHermesTask(
  taskType: HermesTask,
  input: string | undefined,
  mockData: {
    newLeadsCount: number
    dueFollowupsCount: number
    onboardingClientsCount: number
    totalLeads: number
    qualifiedLeads: number
    activeClients: number
  }
): HermesResult {
  const { newLeadsCount, dueFollowupsCount, onboardingClientsCount, totalLeads, qualifiedLeads, activeClients } = mockData

  switch (taskType) {
    case "qualify_leads": {
      const leadsProcessed = newLeadsCount
      const output = `Qualified ${leadsProcessed} leads.`
      return { output, leadsProcessed, messagesQueued: 0 }
    }
    case "send_followups": {
      const messagesQueued = dueFollowupsCount
      const output = `Sent ${messagesQueued} due follow-ups.`
      return { output, leadsProcessed: 0, messagesQueued }
    }
    case "onboard_clients": {
      const leadsProcessed = onboardingClientsCount
      const output = `Reviewed ${leadsProcessed} clients in onboarding.`
      return { output, leadsProcessed, messagesQueued: 0 }
    }
    case "generate_report": {
      const output = `Report: ${totalLeads} total leads, ${qualifiedLeads} qualified, ${activeClients} active clients.`
      return { output, leadsProcessed: 0, messagesQueued: 0 }
    }
    case "custom": {
      const output = `Custom task: ${input || "no input"}`
      return { output, leadsProcessed: 0, messagesQueued: 0 }
    }
    default:
      return { output: "Unknown task", leadsProcessed: 0, messagesQueued: 0 }
  }
}

describe("Hermes AI Task Execution", () => {
  const mockData = {
    newLeadsCount: 5,
    dueFollowupsCount: 3,
    onboardingClientsCount: 2,
    totalLeads: 15,
    qualifiedLeads: 8,
    activeClients: 4,
  }

  it("qualify_leads processes all new leads and returns correct output", () => {
    const result = simulateHermesTask("qualify_leads", undefined, mockData)
    expect(result.leadsProcessed).toBe(5)
    expect(result.messagesQueued).toBe(0)
    expect(result.output).toBe("Qualified 5 leads.")
  })

  it("send_followups sends all due follow-ups", () => {
    const result = simulateHermesTask("send_followups", undefined, mockData)
    expect(result.leadsProcessed).toBe(0)
    expect(result.messagesQueued).toBe(3)
    expect(result.output).toBe("Sent 3 due follow-ups.")
  })

  it("onboard_clients reviews clients in onboarding status", () => {
    const result = simulateHermesTask("onboard_clients", undefined, mockData)
    expect(result.leadsProcessed).toBe(2)
    expect(result.messagesQueued).toBe(0)
    expect(result.output).toBe("Reviewed 2 clients in onboarding.")
  })

  it("generate_report produces summary with all metrics", () => {
    const result = simulateHermesTask("generate_report", undefined, mockData)
    expect(result.output).toBe("Report: 15 total leads, 8 qualified, 4 active clients.")
  })

  it("custom task uses the input string", () => {
    const result = simulateHermesTask("custom", "Find leads in the agriculture sector", mockData)
    expect(result.output).toBe("Custom task: Find leads in the agriculture sector")
  })

  it("custom task with no input shows fallback message", () => {
    const result = simulateHermesTask("custom", undefined, mockData)
    expect(result.output).toBe("Custom task: no input")
  })

  it("qualify_leads handles zero new leads gracefully", () => {
    const result = simulateHermesTask("qualify_leads", undefined, { ...mockData, newLeadsCount: 0 })
    expect(result.leadsProcessed).toBe(0)
    expect(result.output).toBe("Qualified 0 leads.")
  })

  it("send_followups handles zero due follow-ups", () => {
    const result = simulateHermesTask("send_followups", undefined, { ...mockData, dueFollowupsCount: 0 })
    expect(result.messagesQueued).toBe(0)
    expect(result.output).toBe("Sent 0 due follow-ups.")
  })
})
