# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dev-mode-checkout.spec.ts >> Dev-mode simulated checkout flow >> opens pricing → selects card → simulates payment → sees success → redirects to dashboard
- Location: e2e/dev-mode-checkout.spec.ts:197:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 90000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Test source

```ts
  70  |   }
  71  | }
  72  | 
  73  | async function cleanupTestUser() {
  74  |   const prisma = new PrismaClient()
  75  |   try {
  76  |     const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } })
  77  |     if (user) {
  78  |       await prisma.$transaction([
  79  |         prisma.payment.deleteMany({ where: { userId: user.id } }),
  80  |         prisma.subscription.deleteMany({ where: { userId: user.id } }),
  81  |         prisma.revenueEntry.deleteMany({ where: { clientName: user.name } }),
  82  |         prisma.followUpLog.deleteMany({ where: { userId: user.id } }),
  83  |         prisma.user.delete({ where: { id: user.id } }),
  84  |       ])
  85  |       console.log("[Cleanup] Removed test user")
  86  |     }
  87  |   } finally {
  88  |     await prisma.$disconnect()
  89  |   }
  90  | }
  91  | 
  92  | async function dismissCookieConsent(page: Page) {
  93  |   const acceptButton = page.locator("button", { hasText: "Accept All Cookies" })
  94  |   if (await acceptButton.isVisible({ timeout: 2000 }).catch(() => false)) {
  95  |     await acceptButton.click()
  96  |     await page.waitForTimeout(300)
  97  |   }
  98  | }
  99  | 
  100 | /**
  101 |  * Block service worker and SSE notification stream to prevent them
  102 |  * from interfering with E2E tests (SW causes registration errors,
  103 |  * SSE keeps networkidle from ever settling).
  104 |  */
  105 | async function blockBackgroundRequests(page: Page) {
  106 |   // Block service worker (causes registration errors in headless Chrome)
  107 |   await page.route('**/sw.js', route => route.abort())
  108 |   // Fulfill SSE stream with a close immediately to prevent client crash
  109 |   await page.route('**/api/notifications/stream', route => {
  110 |     route.fulfill({
  111 |       status: 200,
  112 |       contentType: 'text/event-stream',
  113 |       body: 'data: {"type":"connected"}\n\ndata: {"type":"close"}\n\n',
  114 |     })
  115 |   })
  116 | }
  117 | 
  118 | function getYearOptions(): string[] {
  119 |   const currentYear = new Date().getFullYear() % 100
  120 |   return Array.from({ length: 10 }, (_, i) => String(currentYear + i))
  121 | }
  122 | 
  123 | /**
  124 |  * Authenticate by submitting the credentials form via DOM.
  125 |  * Uses a real form submission (bypasses React router) to avoid navigation
  126 |  * conflicts from the login page's router.refresh() call.
  127 |  */
  128 | async function loginAsTestUser(page: Page) {
  129 |   await blockBackgroundRequests(page)
  130 | 
  131 |   await page.goto(`${BASE_URL}/login`, { waitUntil: "load" })
  132 | 
  133 |   // Dismiss cookie consent if present
  134 |   const cookieConsent = page.locator("button", { hasText: "Accept All Cookies" })
  135 |   if (await cookieConsent.isVisible({ timeout: 3000 }).catch(() => false)) {
  136 |     await cookieConsent.click()
  137 |     await page.waitForTimeout(500)
  138 |   }
  139 | 
  140 |   // Get CSRF token
  141 |   const { csrfToken } = await page.evaluate(() =>
  142 |     fetch('/api/auth/csrf').then(r => r.json())
  143 |   )
  144 | 
  145 |   // Submit credentials via DOM form submission (bypasses React router)
  146 |   await page.evaluate(async ({ email, password, csrfToken }: { email: string; password: string; csrfToken: string }) => {
  147 |     const form = document.createElement('form')
  148 |     form.method = 'POST'
  149 |     form.action = '/api/auth/callback/credentials'
  150 | 
  151 |     const addField = (name: string, value: string) => {
  152 |       const input = document.createElement('input')
  153 |       input.type = 'hidden'
  154 |       input.name = name
  155 |       input.value = value
  156 |       form.appendChild(input)
  157 |     }
  158 | 
  159 |     addField('csrfToken', csrfToken)
  160 |     addField('email', email)
  161 |     addField('password', password)
  162 |     addField('callbackUrl', '/dashboard')
  163 | 
  164 |     document.body.appendChild(form)
  165 |     form.submit()
  166 |   }, { email: TEST_EMAIL, password: TEST_PASSWORD, csrfToken })
  167 | 
  168 |   // Wait for redirect to dashboard (from the form submission)
  169 |   // Note: Next.js 16 dev mode compilation can take 30-60s on first load
> 170 |   await page.waitForURL(/dashboard/, { timeout: 90000 })
      |              ^ TimeoutError: page.waitForURL: Timeout 90000ms exceeded.
  171 |   await page.waitForLoadState("networkidle").catch(() => {})
  172 |   await page.waitForTimeout(500)
  173 | }
  174 | 
  175 | // ═══════════════════════════════════════════════════════════════════════════
  176 | // Setup / Teardown
  177 | // ═══════════════════════════════════════════════════════════════════════════
  178 | 
  179 | test.beforeAll(async () => {
  180 |   await seedTestUser()
  181 | })
  182 | 
  183 | test.afterEach(async ({ page }) => {
  184 |   // Reset page to prevent state leakage between tests
  185 |   await page.goto("about:blank").catch(() => {})
  186 | })
  187 | 
  188 | test.afterAll(async () => {
  189 |   await cleanupTestUser()
  190 | })
  191 | 
  192 | // ═══════════════════════════════════════════════════════════════════════════
  193 | // Tests
  194 | // ═══════════════════════════════════════════════════════════════════════════
  195 | 
  196 | test.describe("Dev-mode simulated checkout flow", () => {
  197 |   test("opens pricing → selects card → simulates payment → sees success → redirects to dashboard", async ({ page }) => {
  198 |     // ── Step 1: Authenticate and load pricing page ────────────────────
  199 |     await loginAsTestUser(page)
  200 |     await page.goto(`${BASE_URL}/pricing`, { waitUntil: "load" })
  201 |     await dismissCookieConsent(page)
  202 | 
  203 |     // Wait for session to load and "Choose Plan" to appear
  204 |     const choosePlanButton = page.locator("button", { hasText: "Choose Plan" }).first()
  205 |     await expect(choosePlanButton).toBeVisible({ timeout: 15000 })
  206 | 
  207 |     // ── Step 2: Verify pricing page shows plan cards ──────────────────
  208 |     await expect(page.getByText("Starter", { exact: true }).first()).toBeVisible()
  209 |     await expect(page.getByText("Growth", { exact: true }).first()).toBeVisible()
  210 |     await expect(page.getByText("Enterprise", { exact: true }).first()).toBeVisible()
  211 |     await expect(page.getByText("$50", { exact: true }).first()).toBeVisible()
  212 |     await expect(page.getByText("$200", { exact: true }).first()).toBeVisible()
  213 |     await expect(page.getByText("$500", { exact: true }).first()).toBeVisible()
  214 | 
  215 |     // ── Step 3: Click "Choose Plan" on Starter ───────────────────────
  216 |     await choosePlanButton.click()
  217 | 
  218 |     // ── Step 4: Verify the PaymentCheckout content opens ──────────────
  219 |     // Use data-testid selectors to avoid strict-mode conflicts
  220 |     const checkoutContent = page.locator('[data-testid="payment-method-selection"]')
  221 |     await expect(checkoutContent).toBeVisible({ timeout: 5000 })
  222 | 
  223 |     // Dialog header shows plan info
  224 |     await expect(page.locator("text=Complete Your Payment")).toBeVisible()
  225 |     await expect(page.getByText('$50/mo', { exact: true }).first()).toBeVisible()
  226 | 
  227 |     // ── Step 5: Verify all three payment methods are listed ──────────
  228 |     await expect(page.locator("text=Credit / Debit Card")).toBeVisible()
  229 |     await expect(page.getByText("M-Pesa", { exact: true }).first()).toBeVisible()
  230 |     await expect(page.locator("text=Mobile Money")).toBeVisible()
  231 | 
  232 |     // ── Step 6: Select card payment method ───────────────────────────
  233 |     await page.locator("button", { hasText: "Credit / Debit Card" }).click()
  234 | 
  235 |     // ── Step 7: Verify card payment form appears ─────────────────────
  236 |     await expect(page.locator('[data-testid="card-payment-form"]')).toBeVisible()
  237 |     await expect(page.locator("text=Pay with Card")).toBeVisible()
  238 |     await expect(page.locator("text=$50 — Starter (monthly)")).toBeVisible()
  239 |     await expect(page.locator("#cardNumber")).toBeVisible()
  240 |     await expect(page.locator("#cvv")).toBeVisible()
  241 | 
  242 |     // ── Step 8: Fill in sandbox test card details ────────────────────
  243 |     await page.locator("#cardNumber").fill("4242 4242 4242 4242")
  244 |     await page.locator("#cvv").fill("123")
  245 | 
  246 |     // Select expiry
  247 |     await page.locator("label", { hasText: "Expiry" })
  248 |       .locator("..")
  249 |       .locator("select")
  250 |       .first()
  251 |       .selectOption("12")
  252 | 
  253 |     const currentYear = new Date().getFullYear() % 100
  254 |     const yearOptions = Array.from({ length: 10 }, (_, i) => String(currentYear + i))
  255 |     await page.locator("label", { hasText: "Expiry" })
  256 |       .locator("..")
  257 |       .locator("select")
  258 |       .nth(1)
  259 |       .selectOption(yearOptions[3])
  260 | 
  261 |     // Verify Pay button is enabled
  262 |     const payButton = page.locator('[data-testid="pay-button"]')
  263 |     await expect(payButton).toBeEnabled()
  264 |     await expect(payButton).toContainText("Pay $50 via Card")
  265 | 
  266 |     // ── Step 9: Simulate dev-mode payment via route interception ─────
  267 |     const MOCK_TX_REF = `devmode-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  268 | 
  269 |     await page.route("**/api/payments/initiate", async (route: Route) => {
  270 |       await route.fulfill({
```