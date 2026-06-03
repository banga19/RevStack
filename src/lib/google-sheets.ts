import { google } from "googleapis"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SignupRow {
  id: string
  name: string
  email: string
  phone?: string | null
  termsAccepted: boolean
  trialStartedAt: string
  trialEndsAt: string
  subscriptionStatus: string
  subscriptionPlan: string
  createdAt: string
}

export interface OnboardingRow {
  userId: string
  businessName: string
  industry: string
  companySize?: string | null
  primaryGoal: string
  secondaryGoals?: string | null
  currentChallenges?: string | null
  targetAudience?: string | null
  servicesNeeded?: string | null
  budgetRange?: string | null
  timeline?: string | null
  referralSource?: string | null
  additionalNotes?: string | null
  completed: boolean
  createdAt: string
  suggestedTier?: string | null
  suggestedMonthlyRetainer?: number | null
}

export interface SubscriberRow {
  email: string
  name?: string | null
  source?: string | null
  createdAt: string
}

export interface QuestionnaireRow {
  tempId: string
  userId?: string | null
  whatBringsYou?: string | null
  businessType?: string | null
  industry?: string | null
  companySize?: string | null
  role?: string | null
  primaryGoal: string
  biggestChallenge?: string | null
  servicesInterest?: string | null
  timeline?: string | null
  budgetRange?: string | null
  howDidYouHear?: string | null
  completed: boolean
  createdAt: string
}

// ---------------------------------------------------------------------------
// Sheet tab name mapping — each process gets its own named tab
// ---------------------------------------------------------------------------

const SHEET_NAMES = {
  signups: "New Registrations",
  onboarding: "Onboarding",
  subscribers: "Newsletter Subscribers",
  questionnaires: "Needs Assessments",
} as const

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n")
const QUESTIONNAIRE_SHEET_ID = process.env.GOOGLE_QUESTIONNAIRE_SHEET_ID

let sheetsClient: ReturnType<typeof google.sheets> | null = null

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

function getSheets() {
  if (!SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) return null
  if (!sheetsClient) {
    const auth = new google.auth.JWT({
      email: SERVICE_ACCOUNT_EMAIL,
      key: PRIVATE_KEY,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })
    sheetsClient = google.sheets({ version: "v4", auth })
  }
  return sheetsClient
}

// ---------------------------------------------------------------------------
// Ensure a sheet tab exists — creates it if missing
// ---------------------------------------------------------------------------

async function ensureSheetTab(
  sheets: ReturnType<typeof google.sheets>,
  tabName: string,
  spreadsheetId: string
): Promise<void> {
  // Fetch all existing sheet titles
  const res = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title,sheets.properties.sheetId",
  })
  const existingTitles = (res.data.sheets ?? [])
    .map((s) => s.properties?.title)
    .filter(Boolean) as string[]

  // If the tab already exists, nothing to do
  if (existingTitles.includes(tabName)) return

  // Otherwise create it
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: tabName },
            },
          },
        ],
      },
    })
  } catch (error) {
    console.error(`Failed to create sheet tab "${tabName}":`, error)
  }
}

// ---------------------------------------------------------------------------
// Ensure header row exists on the tab
// ---------------------------------------------------------------------------

async function ensureHeaders(
  sheets: ReturnType<typeof google.sheets>,
  tabName: string,
  headers: string[],
  spreadsheetId: string
): Promise<void> {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${tabName}!A1:Z1`,
    })
    const existing = res.data.values?.[0] ?? []
    if (existing.length === 0 || !headers.every((h, i) => existing[i] === h)) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tabName}!A1:Z1`,
        valueInputOption: "RAW",
        requestBody: { values: [headers] },
      })
    }
  } catch (err) {
    // Tab may not exist (е.g., just created) — ensureHeaders is called after ensureSheetTab
    console.error(`Error reading/writing headers for "${tabName}":`, err instanceof Error ? err.message : err)
  }
}

// ---------------------------------------------------------------------------
// Append a row — full pipeline: ensure tab → ensure headers → append
// ---------------------------------------------------------------------------

async function appendRow(
  sheets: ReturnType<typeof google.sheets>,
  tabName: string,
  headers: string[],
  values: unknown[],
  spreadsheetId: string
): Promise<void> {
  // Make sure the sheet tab exists (creates if not)
  await ensureSheetTab(sheets, tabName, spreadsheetId)
  // Make sure headers are written
  await ensureHeaders(sheets, tabName, headers, spreadsheetId)
  // Append the data row
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A:Z`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [values.map((v) => v ?? "")],
    },
  })
}

// ---------------------------------------------------------------------------
// Public API — called from API routes
// ---------------------------------------------------------------------------

const SPREADSHEET_MUST_EXIST = () => {
  if (!SPREADSHEET_ID) throw new Error("GOOGLE_SHEET_ID is not configured")
  return SPREADSHEET_ID
}

/**
 * Append a new user registration row to the "New Registrations" sheet tab.
 * Creates the tab and headers automatically if they don't exist.
 */
export async function appendSignupRow(row: SignupRow) {
  const sheets = getSheets()
  if (!sheets) return
  const sid = SPREADSHEET_MUST_EXIST()

  const tabName = SHEET_NAMES.signups
  const headers = [
    "ID", "Name", "Email", "Phone", "Terms Accepted",
    "Trial Started", "Trial Ends", "Status", "Plan", "Created At",
  ]
  await appendRow(sheets, tabName, headers, [
    row.id,
    row.name,
    row.email,
    row.phone ?? "",
    row.termsAccepted ? "Yes" : "No",
    row.trialStartedAt,
    row.trialEndsAt,
    row.subscriptionStatus,
    row.subscriptionPlan,
    row.createdAt,
  ], sid)
}

/**
 * Append a new onboarding response row to the "Onboarding" sheet tab.
 * Creates the tab and headers automatically if they don't exist.
 */
export async function appendOnboardingRow(row: OnboardingRow) {
  const sheets = getSheets()
  if (!sheets) return
  const sid = SPREADSHEET_MUST_EXIST()

  const tabName = SHEET_NAMES.onboarding
  const headers = [
    "User ID", "Business Name", "Industry", "Company Size", "Primary Goal",
    "Secondary Goals", "Current Challenges", "Target Audience", "Services Needed",
    "Budget Range", "Timeline", "Referral Source", "Additional Notes",
    "Completed", "Created At", "Suggested Tier", "Suggested Monthly Retainer",
  ]
  await appendRow(sheets, tabName, headers, [
    row.userId,
    row.businessName,
    row.industry,
    row.companySize ?? "",
    row.primaryGoal,
    row.secondaryGoals ?? "",
    row.currentChallenges ?? "",
    row.targetAudience ?? "",
    row.servicesNeeded ?? "",
    row.budgetRange ?? "",
    row.timeline ?? "",
    row.referralSource ?? "",
    row.additionalNotes ?? "",
    row.completed ? "Yes" : "No",
    row.createdAt,
    row.suggestedTier ?? "",
    row.suggestedMonthlyRetainer ?? "",
  ], sid)
}

/**
 * Append a new newsletter subscriber row to the "Newsletter Subscribers" sheet tab.
 * Creates the tab and headers automatically if they don't exist.
 */
export async function appendSubscriberRow(row: SubscriberRow) {
  const sheets = getSheets()
  if (!sheets) return
  const sid = SPREADSHEET_MUST_EXIST()

  const tabName = SHEET_NAMES.subscribers
  const headers = ["Email", "Name", "Source", "Created At"]
  await appendRow(sheets, tabName, headers, [
    row.email,
    row.name ?? "",
    row.source ?? "landing-page",
    row.createdAt,
  ], sid)
}

/**
 * Append a new needs-assessment (questionnaire) row to the "Needs Assessments" sheet tab.
 * Creates the tab and headers automatically if they don't exist.
 *
 * If GOOGLE_QUESTIONNAIRE_SHEET_ID is set, uses that separate workbook;
 * otherwise falls back to the main GOOGLE_SHEET_ID workbook.
 */
export async function appendQuestionnaireRow(row: QuestionnaireRow) {
  const sheets = getSheets()
  if (!sheets) return

  const sid = QUESTIONNAIRE_SHEET_ID || SPREADSHEET_ID
  if (!sid) return

  const tabName = SHEET_NAMES.questionnaires
  const headers = [
    "Temp ID", "User ID", "What Brings You", "Business Type", "Industry",
    "Company Size", "Role", "Primary Goal", "Biggest Challenge", "Services Interest",
    "Timeline", "Budget Range", "How Did You Hear", "Completed", "Created At",
  ]
  await appendRow(sheets, tabName, headers, [
    row.tempId,
    row.userId ?? "",
    row.whatBringsYou ?? "",
    row.businessType ?? "",
    row.industry ?? "",
    row.companySize ?? "",
    row.role ?? "",
    row.primaryGoal,
    row.biggestChallenge ?? "",
    row.servicesInterest ?? "",
    row.timeline ?? "",
    row.budgetRange ?? "",
    row.howDidYouHear ?? "",
    row.completed ? "Yes" : "No",
    row.createdAt,
  ], sid)
}
