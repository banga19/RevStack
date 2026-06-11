# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: revstack-dashboard.spec.ts >> RevStack Dashboard >> invoice and health widgets show empty state when no data
- Location: e2e/revstack-dashboard.spec.ts:428:7

# Error details

```
Error: Login failed: redirected back to /login after POST to credentials callback
```

# Test source

```ts
  65  |   } finally {
  66  |     await prisma.$disconnect()
  67  |   }
  68  | }
  69  | 
  70  | async function cleanupTestUser() {
  71  |   const prisma = new PrismaClient()
  72  |   try {
  73  |     const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } })
  74  |     if (user) {
  75  |       await prisma.$transaction([
  76  |         prisma.payment.deleteMany({ where: { userId: user.id } }),
  77  |         prisma.subscription.deleteMany({ where: { userId: user.id } }),
  78  |         prisma.revenueEntry.deleteMany({ where: { clientName: user.name } }),
  79  |         prisma.followUpLog.deleteMany({ where: { userId: user.id } }),
  80  |         prisma.user.delete({ where: { id: user.id } }),
  81  |       ])
  82  |       console.log("[Seed] Cleaned up test user")
  83  |     }
  84  |   } finally {
  85  |     await prisma.$disconnect()
  86  |   }
  87  | }
  88  | 
  89  | async function dismissCookieConsent(page: Page) {
  90  |   const acceptButton = page.locator("button", { hasText: "Accept All Cookies" })
  91  |   if (await acceptButton.isVisible({ timeout: 2000 }).catch(() => false)) {
  92  |     await acceptButton.click()
  93  |     await page.waitForTimeout(300)
  94  |   }
  95  | }
  96  | 
  97  | async function blockBackgroundRequests(page: Page) {
  98  |   await page.route("**/sw.js", (route) => route.abort())
  99  |   await page.route("**/api/notifications/stream", (route) => {
  100 |     route.fulfill({
  101 |       status: 200,
  102 |       contentType: "text/event-stream",
  103 |       body: 'data: {"type":"connected"}\n\ndata: {"type":"close"}\n\n',
  104 |     })
  105 |   })
  106 | }
  107 | 
  108 | /**
  109 |  * Authenticate by DOM form POST to the NextAuth credentials callback.
  110 |  * Uses callbackUrl=/revstack so the post-login hard redirect lands straight
  111 |  * on the RevStack dashboard (no intermediate /dashboard hop).
  112 |  *
  113 |  * This is the exact same proven pattern used by checkout-flow.spec.ts and
  114 |  * dev-mode-checkout.spec.ts — it bypasses React strict mode / router issues.
  115 |  */
  116 | async function loginAsTestUser(page: Page) {
  117 |   await blockBackgroundRequests(page)
  118 | 
  119 |   await page.goto(`${BASE_URL}/login`, { waitUntil: "load" })
  120 | 
  121 |   const cookieConsent = page.locator("button", { hasText: "Accept All Cookies" })
  122 |   if (await cookieConsent.isVisible({ timeout: 3000 }).catch(() => false)) {
  123 |     await cookieConsent.click()
  124 |     await page.waitForTimeout(500)
  125 |   }
  126 | 
  127 |   const { csrfToken } = await page.evaluate(() =>
  128 |     fetch("/api/auth/csrf").then((r) => r.json())
  129 |   )
  130 | 
  131 |   await page.evaluate(
  132 |     async ({ email, password, csrfToken }: { email: string; password: string; csrfToken: string }) => {
  133 |       const form = document.createElement("form")
  134 |       form.method = "POST"
  135 |       form.action = "/api/auth/callback/credentials"
  136 | 
  137 |       const addField = (name: string, value: string) => {
  138 |         const input = document.createElement("input")
  139 |         input.type = "hidden"
  140 |         input.name = name
  141 |         input.value = value
  142 |         form.appendChild(input)
  143 |       }
  144 | 
  145 |       addField("csrfToken", csrfToken)
  146 |       addField("email", email)
  147 |       addField("password", password)
  148 |       addField("callbackUrl", "/revstack")
  149 | 
  150 |       document.body.appendChild(form)
  151 |       form.submit()
  152 |     },
  153 |     { email: TEST_EMAIL, password: TEST_PASSWORD, csrfToken }
  154 |   )
  155 | 
  156 |   // Accept either /revstack (success) or /login (failure) so we get a clear
  157 |   // error instead of a 90s blind timeout when something goes wrong.
  158 |   await page.waitForURL(/revstack|login/, { timeout: 90000 })
  159 | 
  160 |   if (page.url().includes("/login")) {
  161 |     const errorMsg = page.locator("text=Invalid email or password")
  162 |     if (await errorMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
  163 |       throw new Error("Login failed: invalid credentials for " + TEST_EMAIL)
  164 |     }
> 165 |     throw new Error("Login failed: redirected back to /login after POST to credentials callback")
      |           ^ Error: Login failed: redirected back to /login after POST to credentials callback
  166 |   }
  167 | 
  168 |   await page.waitForLoadState("networkidle").catch(() => {})
  169 |   await page.waitForTimeout(500)
  170 | }
  171 | 
  172 | function getMockRevStackData() {
  173 |   const now = new Date()
  174 |   const dueSoon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
  175 |   const dueLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()
  176 |   const issued = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
  177 |   const paidAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
  178 | 
  179 |   return {
  180 |     stats: {
  181 |       totalLeads: 42,
  182 |       qualifiedLeads: 18,
  183 |       activeClients: 12,
  184 |       monthlyRecurringRevenue: 8500,
  185 |       pendingFollowups: 5,
  186 |       conversionRate: 32,
  187 |       totalMessages: 124,
  188 |       hermesRunsToday: 7,
  189 |     },
  190 |     revenue: [
  191 |       { month: "Jan", revenue: 5000, newClients: 1 },
  192 |       { month: "Feb", revenue: 6200, newClients: 2 },
  193 |       { month: "Mar", revenue: 7100, newClients: 1 },
  194 |       { month: "Apr", revenue: 7800, newClients: 2 },
  195 |       { month: "May", revenue: 8200, newClients: 1 },
  196 |       { month: "Jun", revenue: 8500, newClients: 0 },
  197 |     ],
  198 |     pipeline: { new: 10, qualified: 18, disqualified: 8, converted: 6 },
  199 |     activity: [
  200 |       {
  201 |         id: "act-1",
  202 |         type: "followup_sent",
  203 |         description: "Follow-up sent to Acme Corp",
  204 |         entityType: "followup",
  205 |         createdAt: now.toISOString(),
  206 |       },
  207 |       {
  208 |         id: "act-2",
  209 |         type: "client_onboarded",
  210 |         description: "New client onboarded: Globex Inc",
  211 |         entityType: "client",
  212 |         createdAt: new Date(now.getTime() - 3600000).toISOString(),
  213 |       },
  214 |     ],
  215 |     runs: [
  216 |       {
  217 |         id: "run-1",
  218 |         taskType: "qualify_leads",
  219 |         status: "completed",
  220 |         output: "Processed 15 leads",
  221 |         leadsProcessed: 15,
  222 |         messagesQueued: null,
  223 |         createdAt: new Date(now.getTime() - 7200000).toISOString(),
  224 |         completedAt: new Date(now.getTime() - 7000000).toISOString(),
  225 |       },
  226 |     ],
  227 |     invoices: [
  228 |       {
  229 |         id: "inv-1",
  230 |         invoiceNumber: "INV-001",
  231 |         amountUsd: 2500,
  232 |         currency: "USD",
  233 |         status: "paid",
  234 |         dueDate: dueLater,
  235 |         issuedAt: issued,
  236 |         paidAt: paidAt,
  237 |         notes: null,
  238 |         client: { name: "Acme Corp", company: "Acme Industries" },
  239 |       },
  240 |       {
  241 |         id: "inv-2",
  242 |         invoiceNumber: "INV-002",
  243 |         amountUsd: 1800,
  244 |         currency: "USD",
  245 |         status: "sent",
  246 |         dueDate: dueSoon,
  247 |         issuedAt: issued,
  248 |         paidAt: null,
  249 |         notes: "Q2 retainer",
  250 |         client: { name: "Globex Inc", company: "Globex Ltd" },
  251 |       },
  252 |       {
  253 |         id: "inv-3",
  254 |         invoiceNumber: "INV-003",
  255 |         amountUsd: 1200,
  256 |         currency: "USD",
  257 |         status: "overdue",
  258 |         dueDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  259 |         issuedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  260 |         paidAt: null,
  261 |         notes: null,
  262 |         client: { name: "Initech", company: "Initech Corp" },
  263 |       },
  264 |     ],
  265 |     invoiceMetrics: {
```