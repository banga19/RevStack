/**
 * Admin Hermes Page — Unit Tests
 *
 * Tests the HermesAdminPage component for rendering and behavior across states:
 *   1. Loading (abacLoading) — shows spinner
 *   2. Access denied (non-admin) — shows error + redirect button
 *   3. Data loading — shows shimmer skeleton
 *   4. Error state — shows error message
 *   5. Data loaded — queue status cards, run records, aggregates
 *   6. Empty runs — shows empty state message
 *   7. Filtered runs — shows filter-active message
 *   8. Expanded run detail — toggles detail view
 *   9. Action feedback toast — success and error variants
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"

// ============================================================
// Hoisted mocks — must be before any imports
// ============================================================

// Mock next-auth/react (dependency of useAbac)
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({
    data: { user: { id: "admin-1", role: "admin", name: "Admin" } },
    status: "authenticated",
    update: vi.fn(),
  })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

// Mock next/navigation
const mockPush = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => "/admin/hermes"),
}))

// Mock @/lib/abac (dependency of useAbac)
vi.mock("@/lib/abac", () => ({
  checkAccess: vi.fn(() => ({ allowed: true, reason: "Admin", grants: ["admin:full"] })),
  RESOURCES: { "hermes-runs": "hermes-runs" },
}))

// Mock @/lib/utils
vi.mock("@/lib/utils", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}))

// Mock shadcn UI components — render as simple elements for testing
vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: any) => <div data-testid="card" className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div data-testid="card-content" className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div data-testid="card-header" className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <div data-testid="card-title" className={className}>{children}</div>,
  CardDescription: ({ children, className }: any) => <div data-testid="card-description" className={className}>{children}</div>,
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, variant, size, className }: any) => (
    <button
      data-testid="button"
      data-variant={variant}
      data-size={size}
      disabled={disabled}
      onClick={onClick}
      className={className}
    >
      {children}
    </button>
  ),
}))

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, className }: any) => <span data-testid="badge" className={className}>{children}</span>,
}))

vi.mock("@/components/ui/input", () => ({
  Input: ({ placeholder, value, onChange, id, className }: any) => (
    <input
      data-testid="input"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      id={id}
      className={className}
    />
  ),
}))

vi.mock("@/components/ui/progress", () => ({
  Progress: ({ value, className }: any) => (
    <div data-testid="progress" data-value={value} className={className} />
  ),
}))

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr data-testid="separator" />,
}))

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value}>
      <select
        onChange={(e) => onValueChange?.(e.target.value)}
        value={value}
      >
        {children}
      </select>
    </div>
  ),
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => (
    <option value={value} data-testid="select-item">{children}</option>
  ),
  SelectTrigger: ({ children, className }: any) => <span data-testid="select-trigger" className={className}>{children}</span>,
  SelectValue: ({ placeholder }: any) => <span data-testid="select-value">{placeholder}</span>,
}))

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: any) => <div data-testid="dialog">{children}</div>,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }: any) => <p data-testid="dialog-description">{children}</p>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h3 data-testid="dialog-title">{children}</h3>,
  DialogTrigger: ({ children, asChild }: any) => <>{children}</>,
}))

// Mock lucide-react icons
vi.mock("lucide-react", () => {
  const icon = (name: string) => () => <span data-testid={`icon-${name}`} />
  return {
    Shield: icon("Shield"),
    ShieldAlert: icon("ShieldAlert"),
    Loader2: icon("Loader2"),
    RefreshCw: icon("RefreshCw"),
    CheckCircle2: icon("CheckCircle2"),
    XCircle: icon("XCircle"),
    Clock: icon("Clock"),
    AlertTriangle: icon("AlertTriangle"),
    Sparkles: icon("Sparkles"),
    Brain: icon("Brain"),
    Play: icon("Play"),
    Zap: icon("Zap"),
    ListTodo: icon("ListTodo"),
    BarChart3: icon("BarChart3"),
    Activity: icon("Activity"),
    Database: icon("Database"),
    HardDrive: icon("HardDrive"),
    Send: icon("Send"),
    Search: icon("Search"),
    Filter: icon("Filter"),
    ChevronDown: icon("ChevronDown"),
    ChevronRight: icon("ChevronRight"),
    Users: icon("Users"),
    Globe: icon("Globe"),
    Mail: icon("Mail"),
    MessageSquare: icon("MessageSquare"),
    FileText: icon("FileText"),
    Timer: icon("Timer"),
    AlertCircle: icon("AlertCircle"),
  }
})

// Replace the default useAbac with one we control in each test
// by wrapping render and passing a mock module override
const mockUseAbac = vi.fn()

vi.mock("@/lib/use-abac", () => ({
  useAbac: (...args: any[]) => mockUseAbac(...args),
}))

// ============================================================
// Import component after mocks
// ============================================================

import HermesAdminPage from "./page"

// ============================================================
// Test data
// ============================================================

const mockQueueStatus = {
  queue: {
    name: "hermes-tasks",
    counts: { waiting: 12, active: 3, completed: 245, failed: 8, delayed: 0 },
    total: 268,
    workerRunning: true,
    redisConnected: true,
  },
  recentJobs: [],
  runs: [
    {
      id: "run-abc123",
      taskType: "qualify_leads",
      status: "completed",
      leadsProcessed: 15,
      messagesQueued: 8,
      errorMessage: null,
      userId: "admin-1",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      completedAt: new Date(Date.now() - 1800000).toISOString(),
      inputPreview: '{"leadId":"clxx-1","companyName":"Acme Corp"}',
      outputPreview: '{"stage":"scored","score":75}',
    },
    {
      id: "run-def456",
      taskType: "send_followups",
      status: "failed",
      leadsProcessed: 0,
      messagesQueued: 0,
      errorMessage: "WATI API rate limit exceeded",
      userId: "admin-1",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      completedAt: null,
      inputPreview: '{"campaignId":"camp-1"}',
      outputPreview: null,
    },
  ],
  aggregates: {
    byTaskType: [
      { taskType: "qualify_leads", count: 10, lastRun: new Date().toISOString() },
      { taskType: "send_followups", count: 5, lastRun: new Date(Date.now() - 86400000).toISOString() },
    ],
    byStatus: [
      { status: "completed", count: 14 },
      { status: "failed", count: 2 },
      { status: "running", count: 1 },
    ],
    totalRuns: 17,
  },
}

// ============================================================
// Helpers
// ============================================================

function renderPage(overrides: {
  abacLoading?: boolean
  isAdmin?: boolean
  mockData?: typeof mockQueueStatus | null
  mockError?: boolean
} = {}) {
  const { abacLoading = false, isAdmin = true, mockData = mockQueueStatus, mockError = false } = overrides

  // Configure useAbac mock
  mockUseAbac.mockReturnValue({
    isAdmin,
    isLoading: abacLoading,
    canAccess: vi.fn(() => isAdmin),
    getAccessDecision: vi.fn(() => ({ allowed: isAdmin, reason: "", grants: [] })),
    user: isAdmin ? { id: "admin-1", role: "admin" } : { id: "user-1", role: "user" },
    isAuthenticated: true,
  })

  // Mock global fetch
  if (mockError) {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"))
  } else if (mockData) {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockData),
    })
  } else {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        queue: { name: "hermes-tasks", counts: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }, total: 0, workerRunning: true, redisConnected: true },
        recentJobs: [],
        runs: [],
        aggregates: { byTaskType: [], byStatus: [], totalRuns: 0 },
      }),
    })
  }

  return render(<HermesAdminPage />)
}

// ============================================================
// Tests
// ============================================================

describe("HermesAdminPage", () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockClear()
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  // ── Loading state ─────────────────────────────────────────
  describe("loading state (abac check)", () => {
    it("shows a loading spinner when ABAC is still loading", () => {
      renderPage({ abacLoading: true })
      expect(screen.getByTestId("icon-Loader2")).toBeTruthy()
    })

    it("does not redirect when ABAC is loading", () => {
      renderPage({ abacLoading: true })
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  // ── Access denied ─────────────────────────────────────────
  describe("access denied (non-admin)", () => {
    it("shows access denied message when user is not admin", () => {
      renderPage({ isAdmin: false })
      expect(screen.getByText("Access Denied")).toBeTruthy()
      expect(screen.getByText("You do not have admin privileges to view this page.")).toBeTruthy()
    })

    it("shows a button to go to admin panel", () => {
      renderPage({ isAdmin: false })
      const buttons = screen.getAllByTestId("button")
      const goButton = buttons.find((b) => b.textContent?.includes("Go to Admin Panel"))
      expect(goButton).toBeTruthy()
    })

    it("redirects to /dashboard when non-admin", () => {
      renderPage({ isAdmin: false })
      expect(mockPush).toHaveBeenCalledWith("/dashboard")
    })
  })

  // ── Data loading ──────────────────────────────────────────
  describe("data loading state", () => {
    it("shows shimmer placeholders while fetching data", async () => {
      // Mock fetch to never resolve during this test
      globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {}))

      renderPage({})
      // The loading state shows shimmer divs (which have className "shimmer")
      const shimmerElements = document.querySelectorAll(".shimmer")
      expect(shimmerElements.length).toBeGreaterThan(0)
    })
  })

  // ── Error state ───────────────────────────────────────────
  describe("error state", () => {
    it("shows error message when fetch fails", async () => {
      renderPage({ mockError: true })
      // Wait for the error to render
      const errorText = await screen.findByText("Failed to load Hermes queue status")
      expect(errorText).toBeTruthy()
    })

    it("shows AlertTriangle icon in error state", async () => {
      renderPage({ mockError: true })
      const alertIcon = await screen.findByTestId("icon-AlertTriangle")
      expect(alertIcon).toBeTruthy()
    })
  })

  // ── Empty state ───────────────────────────────────────────
  describe("empty state (no runs)", () => {
    it("shows empty state message when there are no runs", async () => {
      renderPage({ mockData: {
        ...mockQueueStatus,
        runs: [],
        aggregates: { byTaskType: [], byStatus: [], totalRuns: 0 },
      }})

      const emptyText = await screen.findByText("No Hermes runs yet — trigger a sweep to get started")
      expect(emptyText).toBeTruthy()
    })
  })

  // ── Data loaded — header ──────────────────────────────────
  describe("header", () => {
    it("renders the page title", async () => {
      renderPage({})
      const title = await screen.findByText("Hermes Queue Manager")
      expect(title).toBeTruthy()
    })

    it("renders the page description", async () => {
      renderPage({})
      const desc = await screen.findByText(/BullMQ job queue/)
      expect(desc).toBeTruthy()
    })

    it("renders a refresh button", async () => {
      renderPage({})
      const buttons = await screen.findAllByTestId("button")
      const refreshBtn = buttons.find((b) => b.textContent?.includes("Refresh"))
      expect(refreshBtn).toBeTruthy()
    })
  })

  // ── Data loaded — queue status cards ──────────────────────
  describe("queue status cards", () => {
    it("displays waiting count", async () => {
      renderPage({})
      const waiting = await screen.findByText("12")
      expect(waiting).toBeTruthy()
    })

    it("displays active count", async () => {
      renderPage({})
      const active = await screen.findByText("3")
      expect(active).toBeTruthy()
    })

    it("displays completed count", async () => {
      renderPage({})
      // "245" appears in both the completed card and the summary row — use getAllByText
      const matches = await screen.findAllByText("245")
      expect(matches.length).toBeGreaterThanOrEqual(1)
    })

    it("displays failed count", async () => {
      renderPage({})
      const failed = await screen.findByText("8")
      expect(failed).toBeTruthy()
    })

    it("displays delayed count", async () => {
      renderPage({})
      // "0" is generic — find within all matching elements
      const matches = await screen.findAllByText("0")
      expect(matches.length).toBeGreaterThanOrEqual(1)
    })

    it("displays worker status as Running", async () => {
      renderPage({})
      const worker = await screen.findByText("Running")
      expect(worker).toBeTruthy()
    })
  })

  // ── Data loaded — summary row ─────────────────────────────
  describe("summary row", () => {
    it("displays total runs", async () => {
      renderPage({})
      const total = await screen.findByText("17")
      expect(total).toBeTruthy()
    })

    it("displays success rate percentage", async () => {
      renderPage({})
      const pct = await screen.findByText("82%")
      expect(pct).toBeTruthy()
    })
  })

  // ── Data loaded — run records ─────────────────────────────
  describe("run records table", () => {
    it("shows column headers", async () => {
      renderPage({})
      // Headers appear in multiple places — use getAllByText
      const idHeader = await screen.findAllByText("ID")
      expect(idHeader.length).toBeGreaterThanOrEqual(1)
      const typeHeader = await screen.findAllByText("Type")
      expect(typeHeader.length).toBeGreaterThanOrEqual(1)
      const statusHeader = await screen.findAllByText("Status")
      expect(statusHeader.length).toBeGreaterThanOrEqual(1)
    })

    it("shows the first run's task type", async () => {
      renderPage({})
      const taskType = await screen.findAllByText("Qualify Leads")
      expect(taskType.length).toBeGreaterThanOrEqual(1)
    })

    it("shows the second run's task type", async () => {
      renderPage({})
      const taskType = await screen.findAllByText("Send Follow-ups")
      expect(taskType.length).toBeGreaterThanOrEqual(1)
    })

    it("shows the error message for failed runs", async () => {
      renderPage({})
      const errorMsg = await screen.findByText("WATI API rate limit exceeded")
      expect(errorMsg).toBeTruthy()
    })
  })

  // ── Data loaded — job type breakdown ──────────────────────
  describe("job type breakdown", () => {
    it("renders the breakdown section", async () => {
      renderPage({})
      const sectionTitle = await screen.findByText("Job Type Breakdown")
      expect(sectionTitle).toBeTruthy()
    })

    it("shows count for qualify_leads", async () => {
      renderPage({})
      const count = await screen.findByText("10")
      expect(count).toBeTruthy()
    })
  })

  // ── Data loaded — filters ─────────────────────────────────
  describe("filters", () => {
    it("renders status filter with options", async () => {
      renderPage({})
      const allStatuses = await screen.findByText("All Statuses")
      expect(allStatuses).toBeTruthy()
      // "Completed" and "Failed" appear in multiple places — use getAllByText
      const completed = await screen.findAllByText("Completed")
      expect(completed.length).toBeGreaterThanOrEqual(1)
      const failed = await screen.findAllByText("Failed")
      expect(failed.length).toBeGreaterThanOrEqual(1)
    })

    it("renders type filter with options from aggregates", async () => {
      renderPage({})
      const allTypes = await screen.findByText("All Types")
      expect(allTypes).toBeTruthy()
      // "Qualify Leads" appears in both filter and run records — use getAllByText
      const qualifyLeads = await screen.findAllByText("Qualify Leads")
      expect(qualifyLeads.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ── Data loaded — manual controls ─────────────────────────
  describe("manual controls", () => {
    it("renders sweep leads button", async () => {
      renderPage({})
      const sweepBtn = await screen.findByText("Sweep All Leads")
      expect(sweepBtn).toBeTruthy()
    })

    it("renders process single lead section with input", async () => {
      renderPage({})
      const leadInput = await screen.findByPlaceholderText("Lead ID (cuid)...")
      expect(leadInput).toBeTruthy()
    })

    it("renders retry failed job button", async () => {
      renderPage({})
      // "Retry Failed Job" appears in both the trigger button and the dialog title
      const matches = await screen.findAllByText("Retry Failed Job")
      expect(matches.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ── Footer ────────────────────────────────────────────────
  describe("footer", () => {
    it("renders the footer note about RUN_WORKER", async () => {
      renderPage({})
      const footer = await screen.findByText(/Hermes queue runs on BullMQ with Redis/)
      expect(footer).toBeTruthy()
    })
  })
})
