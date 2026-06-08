# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: checkout-flow.spec.ts >> Payment Checkout Flow >> complete checkout: pricing → card payment → success → dashboard redirect
- Location: e2e/checkout-flow.spec.ts:218:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1')
Expected pattern: /plan/i
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('h1')

```

```yaml
- alert
- img
- region "Notifications (F8)":
  - list:
    - listitem:
      - img
      - button:
        - img
    - listitem:
      - img
      - button:
        - img
    - listitem:
      - img
      - button:
        - img
- img
- heading "We use cookies" [level=4]
- paragraph:
  - text: We use cookies and similar technologies to enhance your experience, analyze traffic, and personalize content. By clicking “Accept,” you consent to our use of cookies. You can learn more in our
  - link "Privacy Policy":
    - /url: /privacy
  - text: and
  - link "Terms & Conditions":
    - /url: /terms
  - text: .
- button "Dismiss":
  - img
- button "Accept All Cookies"
- button "Reject Non-Essential"
- button "Enable Notifications":
  - img
  - text: Enable Notifications
- status: Notification
- status
```

# Test source

```ts
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
  162 |   await page.waitForTimeout(500)
  163 | }
  164 | 
  165 | function getYearOptions(): string[] {
  166 |   const currentYear = new Date().getFullYear() % 100
  167 |   return Array.from({ length: 10 }, (_, i) => String(currentYear + i))
  168 | }
  169 | 
  170 | // ───────────────────────────────────────────────────────────────────────────
  171 | // Setup / Teardown
  172 | // ───────────────────────────────────────────────────────────────────────────
  173 | 
  174 | test.beforeAll(async () => {
  175 |   await seedTestUser()
  176 | })
  177 | 
  178 | test.afterEach(async ({ page }) => {
  179 |   // Clean up DB state
  180 |   const prisma = new PrismaClient()
  181 |   try {
  182 |     const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } })
  183 |     if (user && user.subscriptionStatus === "active") {
  184 |       await prisma.payment.deleteMany({ where: { userId: user.id } }).catch(() => {})
  185 |       await prisma.subscription.deleteMany({ where: { userId: user.id } }).catch(() => {})
  186 |       await prisma.revenueEntry.deleteMany({ where: { clientName: user.name } }).catch(() => {})
  187 |       await prisma.followUpLog.deleteMany({ where: { userId: user.id } }).catch(() => {})
  188 |       await prisma.user.update({
  189 |         where: { id: user.id },
  190 |         data: {
  191 |           subscriptionStatus: "trial",
  192 |           subscriptionTier: "enterprise",
  193 |           subscriptionStartsAt: null,
  194 |           subscriptionEndsAt: null,
  195 |           flutterwaveCustomerId: null,
  196 |         },
  197 |       }).catch(() => {})
  198 |     }
  199 |   } catch (e) {
  200 |     console.error("[Cleanup] Error during test cleanup:", e)
  201 |   } finally {
  202 |     await prisma.$disconnect()
  203 |   }
  204 | 
  205 |   // Reset page to prevent state leakage between tests
  206 |   await page.goto("about:blank").catch(() => {})
  207 | })
  208 | 
  209 | test.afterAll(async () => {
  210 |   await cleanupTestUser()
  211 | })
  212 | 
  213 | // ───────────────────────────────────────────────────────────────────────────
  214 | // Tests
  215 | // ───────────────────────────────────────────────────────────────────────────
  216 | 
  217 | test.describe("Payment Checkout Flow", () => {
  218 |   test("complete checkout: pricing → card payment → success → dashboard redirect", async ({ page }) => {
  219 |     // ── Step 1: Login ──────────────────────────────────────────────────
  220 |     await loginAsTestUser(page)
  221 |     await page.goto(`${BASE_URL}/pricing`, { waitUntil: "load" })
  222 | 
  223 |     // Dismiss cookie consent
  224 |     const cookieAccept = page.locator("button", { hasText: "Accept All Cookies" })
  225 |     if (await cookieAccept.isVisible({ timeout: 2000 }).catch(() => false)) {
  226 |       await cookieAccept.click()
  227 |     }
  228 | 
  229 |     // Wait for session to load and content to render
  230 |     await page.waitForLoadState("networkidle")
  231 | 
  232 |     // Verify we're on the pricing page
> 233 |     await expect(page.locator("h1")).toContainText(/plan/i)
      |                                      ^ Error: expect(locator).toContainText(expected) failed
  234 | 
  235 |     // ── Step 2: Click "Choose Plan" on Starter ─────────────────────────
  236 |     const choosePlanButton = page.locator("button", { hasText: "Choose Plan" }).first()
  237 |     await expect(choosePlanButton).toBeVisible({ timeout: 10000 })
  238 |     await choosePlanButton.click()
  239 | 
  240 |     // ── Step 3: Verify Checkout content appears ────────────────────────
  241 |     // Use data-testid to avoid strict-mode conflicts with other role="dialog" elements
  242 |     const checkoutContent = page.locator('[data-testid="payment-method-selection"]')
  243 |     await expect(checkoutContent).toBeVisible({ timeout: 5000 })
  244 | 
  245 |     // Verify the dialog title and payment amount
  246 |     await expect(page.locator("text=Complete Your Payment")).toBeVisible()
  247 |     await expect(page.locator("text=$50/mo")).toBeVisible()
  248 | 
  249 |     // Verify all three payment methods are listed
  250 |     await expect(page.locator("text=Credit / Debit Card")).toBeVisible()
  251 |     await expect(page.getByText("M-Pesa", { exact: true }).first()).toBeVisible()
  252 |     await expect(page.locator("text=Mobile Money")).toBeVisible()
  253 | 
  254 |     // ── Step 4: Select Card payment method ─────────────────────────────
  255 |     await page.locator("button", { hasText: "Credit / Debit Card" }).click()
  256 | 
  257 |     // ── Step 5: Verify card details form and fill it ───────────────────
  258 |     await expect(page.locator('[data-testid="card-payment-form"]')).toBeVisible()
  259 |     await expect(page.locator("text=Pay with Card")).toBeVisible()
  260 |     await expect(page.locator("#cardNumber")).toBeVisible()
  261 |     await expect(page.locator("#cvv")).toBeVisible()
  262 | 
  263 |     // Fill in sandbox test card details
  264 |     await page.locator("#cardNumber").fill("4242 4242 4242 4242")
  265 | 
  266 |     // Select expiry
  267 |     const yearOptions = getYearOptions()
  268 |     await page.locator("label", { hasText: "Expiry" })
  269 |       .locator("..")
  270 |       .locator("select")
  271 |       .first()
  272 |       .selectOption("12")
  273 |     await page.locator("label", { hasText: "Expiry" })
  274 |       .locator("..")
  275 |       .locator("select")
  276 |       .nth(1)
  277 |       .selectOption(yearOptions[3])
  278 | 
  279 |     await page.locator("#cvv").fill("123")
  280 | 
  281 |     // ── Step 6: Intercept API to simulate dev-mode payment ──────────────
  282 |     const MOCK_TX_REF = `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  283 | 
  284 |     await page.route("**/api/payments/initiate", async (route) => {
  285 |       await route.fulfill({
  286 |         status: 200,
  287 |         contentType: "application/json",
  288 |         body: JSON.stringify({
  289 |           success: true,
  290 |           paymentId: "mock-pay-checkout",
  291 |           txRef: MOCK_TX_REF,
  292 |           authUrl: undefined,
  293 |         }),
  294 |       })
  295 |     })
  296 | 
  297 |     let pollCount = 0
  298 |     await page.route("**/api/payments/status**", async (route) => {
  299 |       pollCount++
  300 |       if (pollCount >= 2) {
  301 |         await route.fulfill({
  302 |           status: 200,
  303 |           contentType: "application/json",
  304 |           body: JSON.stringify({ status: "success", tier: "starter", plan: "monthly" }),
  305 |         })
  306 |       } else {
  307 |         await route.fulfill({
  308 |           status: 200,
  309 |           contentType: "application/json",
  310 |           body: JSON.stringify({ status: "pending", tier: "starter", plan: "monthly" }),
  311 |         })
  312 |       }
  313 |     })
  314 | 
  315 |     // ── Step 7: Click "Pay $50 via Card" ───────────────────────────────
  316 |     await page.locator('[data-testid="pay-button"]').click()
  317 | 
  318 |     // ── Step 8: Verify processing state ────────────────────────────
  319 |     await expect(page.locator('[data-testid="payment-processing"]')).toBeVisible({ timeout: 5000 })
  320 |     await expect(page.locator("text=Processing your card payment")).toBeVisible()
  321 | 
  322 |     // ── Step 9: Wait for success via polling ───────────────────────
  323 |     await expect(page.locator('[data-testid="payment-success"]')).toBeVisible({ timeout: 30000 })
  324 | 
  325 |     // ── Step 10: Verify success state details ──────────────────────
  326 |     await expect(page.locator("text=Starter (monthly) subscription is now active")).toBeVisible()
  327 |     await expect(page.locator("text=Redirecting to dashboard...")).toBeVisible()
  328 | 
  329 |     // ── Step 11: Wait for redirect to dashboard ────────────────────
  330 |     await page.waitForURL(/dashboard/, { timeout: 15000 })
  331 |     await expect(page).toHaveURL(/dashboard/)
  332 |   })
  333 | 
```