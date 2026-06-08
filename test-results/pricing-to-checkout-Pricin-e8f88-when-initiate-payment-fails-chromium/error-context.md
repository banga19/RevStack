# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pricing-to-checkout.spec.ts >> Pricing → PaymentCheckout → Success >> shows error state when initiate payment fails
- Location: e2e/pricing-to-checkout.spec.ts:380:7

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: page.waitForTimeout: Target page, context or browser has been closed
```

# Test source

```ts
  62  |     return user
  63  |   } finally {
  64  |     await prisma.$disconnect()
  65  |   }
  66  | }
  67  | 
  68  | async function cleanupTestUser() {
  69  |   const prisma = new PrismaClient()
  70  |   try {
  71  |     const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } })
  72  |     if (user) {
  73  |       await prisma.$transaction([
  74  |         prisma.payment.deleteMany({ where: { userId: user.id } }),
  75  |         prisma.subscription.deleteMany({ where: { userId: user.id } }),
  76  |         prisma.revenueEntry.deleteMany({ where: { clientName: user.name } }),
  77  |         prisma.followUpLog.deleteMany({ where: { userId: user.id } }),
  78  |         prisma.user.delete({ where: { id: user.id } }),
  79  |       ])
  80  |       console.log("[Cleanup] Removed test user")
  81  |     }
  82  |   } finally {
  83  |     await prisma.$disconnect()
  84  |   }
  85  | }
  86  | 
  87  | /**
  88  |  * Block service worker and SSE notification stream to prevent them
  89  |  * from interfering with E2E tests (SW causes registration errors,
  90  |  * SSE keeps networkidle from ever settling).
  91  |  */
  92  | async function blockBackgroundRequests(page: Page) {
  93  |   // Block service worker (causes registration errors in headless Chrome)
  94  |   await page.route('**/sw.js', route => route.abort())
  95  |   // Fulfill SSE stream with a close immediately to prevent client crash
  96  |   await page.route('**/api/notifications/stream', route => {
  97  |     route.fulfill({
  98  |       status: 200,
  99  |       contentType: 'text/event-stream',
  100 |       body: 'data: {"type":"connected"}\n\ndata: {"type":"close"}\n\n',
  101 |     })
  102 |   })
  103 | }
  104 | 
  105 | async function dismissCookieConsent(page: Page) {
  106 |   const acceptButton = page.locator("button", { hasText: "Accept All Cookies" })
  107 |   if (await acceptButton.isVisible({ timeout: 2000 }).catch(() => false)) {
  108 |     await acceptButton.click()
  109 |     await page.waitForTimeout(300)
  110 |   }
  111 | }
  112 | 
  113 | /**
  114 |  * Authenticate by submitting the credentials form via DOM.
  115 |  * Uses a real form submission (bypasses React router) to avoid navigation
  116 |  * conflicts from the login page's router.refresh() call.
  117 |  */
  118 | async function loginAsTestUser(page: Page) {
  119 |   await blockBackgroundRequests(page)
  120 | 
  121 |   await page.goto(`${BASE_URL}/login`, { waitUntil: "load" })
  122 | 
  123 |   // Dismiss cookie consent if present
  124 |   const cookieConsent = page.locator("button", { hasText: "Accept All Cookies" })
  125 |   if (await cookieConsent.isVisible({ timeout: 3000 }).catch(() => false)) {
  126 |     await cookieConsent.click()
  127 |     await page.waitForTimeout(500)
  128 |   }
  129 | 
  130 |   // Get CSRF token
  131 |   const { csrfToken } = await page.evaluate(() =>
  132 |     fetch('/api/auth/csrf').then(r => r.json())
  133 |   )
  134 | 
  135 |   // Submit credentials via DOM form submission (bypasses React router)
  136 |   await page.evaluate(async ({ email, password, csrfToken }: { email: string; password: string; csrfToken: string }) => {
  137 |     const form = document.createElement('form')
  138 |     form.method = 'POST'
  139 |     form.action = '/api/auth/callback/credentials'
  140 | 
  141 |     const addField = (name: string, value: string) => {
  142 |       const input = document.createElement('input')
  143 |       input.type = 'hidden'
  144 |       input.name = name
  145 |       input.value = value
  146 |       form.appendChild(input)
  147 |     }
  148 | 
  149 |     addField('csrfToken', csrfToken)
  150 |     addField('email', email)
  151 |     addField('password', password)
  152 |     addField('callbackUrl', '/dashboard')
  153 | 
  154 |     document.body.appendChild(form)
  155 |     form.submit()
  156 |   }, { email: TEST_EMAIL, password: TEST_PASSWORD, csrfToken })
  157 | 
  158 |   // Wait for redirect to dashboard (from the form submission)
  159 |   // Note: Next.js 16 dev mode compilation can take 30-60s on first load
  160 |   await page.waitForURL(/dashboard/, { timeout: 90000 })
  161 |   await page.waitForLoadState("networkidle").catch(() => {})
> 162 |   await page.waitForTimeout(500)
      |              ^ Error: page.waitForTimeout: Target page, context or browser has been closed
  163 | }
  164 | 
  165 | function getYearOptions(): string[] {
  166 |   const currentYear = new Date().getFullYear() % 100
  167 |   return Array.from({ length: 10 }, (_, i) => String(currentYear + i))
  168 | }
  169 | 
  170 | // ═══════════════════════════════════════════════════════════════════════════
  171 | // Setup / Teardown
  172 | // ═══════════════════════════════════════════════════════════════════════════
  173 | 
  174 | test.beforeAll(async () => {
  175 |   await seedTestUser()
  176 | })
  177 | 
  178 | test.afterEach(async ({ page }) => {
  179 |   // Reset page to prevent state leakage between tests
  180 |   await page.goto("about:blank").catch(() => {})
  181 | })
  182 | 
  183 | test.afterAll(async () => {
  184 |   await cleanupTestUser()
  185 | })
  186 | 
  187 | // ═══════════════════════════════════════════════════════════════════════════
  188 | // Tests
  189 | // ═══════════════════════════════════════════════════════════════════════════
  190 | 
  191 | test.describe("Pricing → PaymentCheckout → Success", () => {
  192 |   test("opens pricing page, clicks a plan, completes checkout via simulated payment", async ({ page }) => {
  193 |     await loginAsTestUser(page)
  194 |     await page.goto(`${BASE_URL}/pricing`, { waitUntil: "load" })
  195 |     await dismissCookieConsent(page)
  196 | 
  197 |     // Wait for the page to be fully rendered and session to load.
  198 |     // The pricing page uses useSession() which loads asynchronously.
  199 |     const choosePlanButton = page.locator("button", { hasText: "Choose Plan" }).first()
  200 |     await expect(choosePlanButton).toBeVisible({ timeout: 15000 })
  201 | 
  202 |     // Verify billing toggle
  203 |     const monthlyToggle = page.locator("button", { hasText: "Monthly" })
  204 |     const yearlyToggle = page.locator("button", { hasText: "Yearly" })
  205 |     await expect(monthlyToggle).toBeVisible()
  206 |     await expect(yearlyToggle).toBeVisible()
  207 | 
  208 |     // All three plan cards should be visible
  209 |     await expect(page.getByText("Starter", { exact: true }).first()).toBeVisible()
  210 |     await expect(page.getByText("Growth", { exact: true }).first()).toBeVisible()
  211 |     await expect(page.getByText("Enterprise", { exact: true }).first()).toBeVisible()
  212 | 
  213 |     // Pricing amounts displayed
  214 |     await expect(page.getByText("$50", { exact: true }).first()).toBeVisible()
  215 |     await expect(page.getByText("$200", { exact: true }).first()).toBeVisible()
  216 |     await expect(page.getByText("$500", { exact: true }).first()).toBeVisible()
  217 | 
  218 |     // Click "Choose Plan" on Starter
  219 |     await choosePlanButton.click()
  220 | 
  221 |     // Verify Checkout content opens
  222 |     await expect(page.locator('[data-testid="payment-method-selection"]')).toBeVisible({ timeout: 5000 })
  223 | 
  224 |     // Dialog shows the correct plan info
  225 |     await expect(page.locator("text=Complete Your Payment")).toBeVisible()
  226 |     await expect(page.getByText('$50/mo', { exact: true }).first()).toBeVisible()
  227 | 
  228 |     // Verify all three payment methods are listed
  229 |     await expect(page.locator("text=Credit / Debit Card")).toBeVisible()
  230 |     await expect(page.getByText("M-Pesa", { exact: true }).first()).toBeVisible()
  231 |     await expect(page.locator("text=Mobile Money")).toBeVisible()
  232 | 
  233 |     // Select card payment method
  234 |     await page.locator("button", { hasText: "Credit / Debit Card" }).click()
  235 | 
  236 |     // Card payment form should appear
  237 |     await expect(page.locator('[data-testid="card-payment-form"]')).toBeVisible()
  238 |     await expect(page.locator("text=Pay with Card")).toBeVisible()
  239 |     await expect(page.locator("text=$50 — Starter (monthly)")).toBeVisible()
  240 | 
  241 |     // Form fields should be present
  242 |     await expect(page.locator("#cardNumber")).toBeVisible()
  243 |     await expect(page.locator("#cvv")).toBeVisible()
  244 | 
  245 |     // Fill in sandbox test card details
  246 |     await page.locator("#cardNumber").fill("4242 4242 4242 4242")
  247 | 
  248 |     const yearOptions = getYearOptions()
  249 | 
  250 |     await page.locator("label", { hasText: "Expiry" })
  251 |       .locator("..")
  252 |       .locator("select")
  253 |       .first()
  254 |       .selectOption("12")
  255 | 
  256 |     await page.locator("label", { hasText: "Expiry" })
  257 |       .locator("..")
  258 |       .locator("select")
  259 |       .nth(1)
  260 |       .selectOption(yearOptions[3])
  261 | 
  262 |     await page.locator("#cvv").fill("123")
```