import { google } from "googleapis"

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

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n")

const SECOND_SHEET_INDEX = Number(process.env.GOOGLE_SECOND_SHEET_INDEX ?? "0")
const SECOND_SHEET_NAME = process.env.GOOGLE_SECOND_SHEET_NAME || "Onboarding"
const QUESTIONNAIRE_SHEET_ID = process.env.GOOGLE_QUESTIONNAIRE_SHEET_ID
const QUESTIONNAIRE_FIRST_SHEET_INDEX = Number(process.env.GOOGLE_QUESTIONNAIRE_FIRST_SHEET_INDEX ?? "0")

let sheetsClient: ReturnType<typeof google.sheets> | null = null

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

async function getSecondSheetName(sheets: ReturnType<typeof google.sheets>) {
  if (SECOND_SHEET_NAME) return SECOND_SHEET_NAME

  if (!SPREADSHEET_ID) return null

  const res = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: "sheets.properties.title,sheets.properties.index",
  })

  const matched = (res.data.sheets ?? [])
    .filter((sheet) => sheet.properties?.index === SECOND_SHEET_INDEX)
    .slice(-1)[0]

  const currentTitle = matched?.properties?.title ?? null
  const targetTitle = SECOND_SHEET_NAME || "Onboarding"

  if (matched?.properties?.sheetId && currentTitle !== targetTitle) {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              updateSheetProperties: {
                properties: {
                  sheetId: matched.properties.sheetId,
                  title: targetTitle,
                },
                fields: "title",
              },
            },
          ],
        },
      })
    } catch (error) {
      console.error("Failed to rename second sheet to Onboarding:", error)
    }
  }

  return targetTitle
}

async function getQuestionnaireSheetName(sheets: ReturnType<typeof google.sheets>) {
  if (!QUESTIONNAIRE_SHEET_ID) return null

  const res = await sheets.spreadsheets.get({
    spreadsheetId: QUESTIONNAIRE_SHEET_ID,
    fields: "sheets.properties.title,sheets.properties.index",
  })

  const matched = (res.data.sheets ?? [])
    .filter((sheet) => sheet.properties?.index === QUESTIONNAIRE_FIRST_SHEET_INDEX)
    .slice(-1)[0]

  return matched?.properties?.title ?? null
}

function appendToSheet(
  sheets: ReturnType<typeof google.sheets>,
  tabName: string,
  headers: string[],
  values: unknown[],
  spreadsheetId = SPREADSHEET_ID
) {
  const targetId = spreadsheetId || SPREADSHEET_ID
  if (!targetId) return Promise.resolve()
  const range = `${tabName}!A:Z`
  return ensureHeaders(sheets, tabName, headers).then(() =>
    sheets.spreadsheets.values.append({
      spreadsheetId: targetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [values.map((v) => v ?? "")] },
    })
  )
}

function ensureHeaders(sheets: ReturnType<typeof google.sheets>, tabName: string, headers: string[], spreadsheetId = SPREADSHEET_ID) {
  const targetId = spreadsheetId || SPREADSHEET_ID
  if (!targetId) return Promise.resolve()
  return sheets.spreadsheets.values.get({
    spreadsheetId: targetId,
    range: `${tabName}!A1:Z1`,
  }).then((res) => {
    const existing = res.data.values?.[0] ?? []
    if (existing.length === 0 || !headers.every((h, i) => existing[i] === h)) {
      return sheets.spreadsheets.values.update({
        spreadsheetId: targetId,
        range: `${tabName}!A1:Z1`,
        valueInputOption: "RAW",
        requestBody: { values: [headers] },
      })
    }
  })
}

export async function appendSignupRow(row: SignupRow) {
  const sheets = getSheets()
  if (!sheets || !SPREADSHEET_ID) return

  const tabName = "New Registrations"
  const headers = [
    "ID", "Name", "Email", "Phone", "Terms Accepted",
    "Trial Started", "Trial Ends", "Status", "Plan", "Created At",
  ]
  await ensureHeaders(sheets, tabName, headers)

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!A:Z`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
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
      ]],
    },
  })
}

export async function appendOnboardingRow(row: OnboardingRow) {
  const sheets = getSheets()
  if (!sheets || !SPREADSHEET_ID) return

  const targetSheetName = await getSecondSheetName(sheets)
  if (!targetSheetName) return

  const headers = [
    "User ID", "Business Name", "Industry", "Company Size", "Primary Goal",
    "Secondary Goals", "Current Challenges", "Target Audience", "Services Needed",
    "Budget Range", "Timeline", "Referral Source", "Additional Notes",
    "Completed", "Created At", "Suggested Tier", "Suggested Monthly Retainer",
  ]
  await appendToSheet(sheets, targetSheetName, headers, [
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
  ])
}

export interface SubscriberRow {
  email: string
  name?: string | null
  source?: string | null
  createdAt: string
}

export async function appendSubscriberRow(row: SubscriberRow) {
  const sheets = getSheets()
  if (!sheets || !SPREADSHEET_ID) return

  const tabName = "Newsletter Subscribers"
  const headers = ["Email", "Name", "Source", "Created At"]
  await ensureHeaders(sheets, tabName, headers)

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!A:Z`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        row.email,
        row.name ?? "",
        row.source ?? "landing-page",
        row.createdAt,
      ]],
    },
  })
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

export async function appendQuestionnaireRow(row: QuestionnaireRow) {
  const sheets = getSheets()
  if (!sheets) return

  const targetSheetName = await getQuestionnaireSheetName(sheets)
  if (!targetSheetName) return

  const targetId = QUESTIONNAIRE_SHEET_ID || SPREADSHEET_ID
  if (!targetId) return

  const tabName = "Needs Assessments"
  const headers = [
    "Temp ID", "User ID", "What Brings You", "Business Type", "Industry",
    "Company Size", "Role", "Primary Goal", "Biggest Challenge", "Services Interest",
    "Timeline", "Budget Range", "How Did You Hear", "Completed", "Created At",
  ]
  await ensureHeaders(sheets, tabName, headers, targetId)
  await sheets.spreadsheets.values.append({
    spreadsheetId: targetId,
    range: `${tabName}!A:Z`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
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
      ]],
    },
  })
}
