# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pricing-to-checkout.spec.ts >> Pricing → PaymentCheckout → Success >> opens pricing page, clicks a plan, completes checkout via simulated payment
- Location: e2e/pricing-to-checkout.spec.ts:192:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-testid="payment-method-selection"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('[data-testid="payment-method-selection"]')

```

```yaml
- alert
- main:
  - img
  - heading "Create account" [level=3]
  - paragraph: Sign in to your Mapato account
  - text: Full name
  - textbox "Full name":
    - /placeholder: John Doe
  - text: Email address
  - textbox "Email address":
    - /placeholder: you@company.com
  - text: Phone (optional — for WhatsApp updates)
  - textbox "Phone (optional — for WhatsApp updates)":
    - /placeholder: 2547XXXXXXXX
  - paragraph: Include country code. Used for M-Pesa payments and WhatsApp follow-up reminders about your trial.
  - text: Password
  - textbox "Password":
    - /placeholder: Create a strong password
  - button:
    - img
  - text: Confirm password
  - textbox "Confirm password":
    - /placeholder: Repeat your password
  - checkbox "I agree to the Terms & Conditions and Privacy Policy . I confirm I have read and agree to the Cookie Policy . I understand that Mapato charges a subscription fee plus a success-based fee on revenue generated through the platform."
  - text: I agree to the
  - link "Terms & Conditions":
    - /url: /terms
  - text: and
  - link "Privacy Policy":
    - /url: /privacy
  - text: . I confirm I have read and agree to the
  - link "Cookie Policy":
    - /url: /privacy#cookies
  - text: . I understand that Mapato charges a subscription fee plus a success-based fee on revenue generated through the platform.
  - button "Create account" [disabled]:
    - img
    - text: Create account
  - paragraph:
    - text: Already have an account?
    - link "Sign in":
      - /url: /login
  - link "+254758947124":
    - /url: tel:+254758947124
    - img
    - text: "+254758947124"
  - link "WhatsApp":
    - /url: https://wa.me/254758947124
    - img
    - text: WhatsApp
  - link "bangali@ultimotradingltd.co.ke":
    - /url: mailto:bangali@ultimotradingltd.co.ke
    - img
    - text: bangali@ultimotradingltd.co.ke
- region "Notifications (F8)":
  - list:
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
- status: Notification
```

# Test source

```ts
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
  162 |   await page.waitForTimeout(500)
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
> 222 |     await expect(page.locator('[data-testid="payment-method-selection"]')).toBeVisible({ timeout: 5000 })
      |                                                                            ^ Error: expect(locator).toBeVisible() failed
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
  263 | 
  264 |     // Pay button should be enabled now
  265 |     const payButton = page.locator('[data-testid="pay-button"]')
  266 |     await expect(payButton).toBeEnabled()
  267 |     await expect(payButton).toContainText("Pay $50 via Card")
  268 | 
  269 |     // Intercept network requests to simulate payment
  270 |     const MOCK_TX_REF = `e2e-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  271 | 
  272 |     await page.route("**/api/payments/initiate", async (route: Route) => {
  273 |       await route.fulfill({
  274 |         status: 200,
  275 |         contentType: "application/json",
  276 |         body: JSON.stringify({
  277 |           success: true,
  278 |           paymentId: "mock-pay-1",
  279 |           txRef: MOCK_TX_REF,
  280 |           authUrl: undefined,
  281 |         }),
  282 |       })
  283 |     })
  284 | 
  285 |     let pollCount = 0
  286 | 
  287 |     await page.route("**/api/payments/status**", async (route: Route) => {
  288 |       pollCount++
  289 |       if (pollCount >= 2) {
  290 |         await route.fulfill({
  291 |           status: 200,
  292 |           contentType: "application/json",
  293 |           body: JSON.stringify({ status: "success", tier: "starter", plan: "monthly" }),
  294 |         })
  295 |       } else {
  296 |         await route.fulfill({
  297 |           status: 200,
  298 |           contentType: "application/json",
  299 |           body: JSON.stringify({ status: "pending", tier: "starter", plan: "monthly" }),
  300 |         })
  301 |       }
  302 |     })
  303 | 
  304 |     // Click Pay button
  305 |     await payButton.click()
  306 | 
  307 |     // Verify processing state
  308 |     await expect(page.locator('[data-testid="payment-processing"]')).toBeVisible({ timeout: 5000 })
  309 |     await expect(page.locator("text=Processing Payment")).toBeVisible()
  310 |     await expect(page.locator("text=Processing your card payment")).toBeVisible()
  311 | 
  312 |     // Wait for success state via polling simulation
  313 |     await expect(page.locator('[data-testid="payment-success"]')).toBeVisible({ timeout: 30000 })
  314 | 
  315 |     await expect(page.locator("text=Payment Successful! 🎉")).toBeVisible()
  316 |     await expect(page.locator("text=Starter (monthly) subscription is now active")).toBeVisible()
  317 |     await expect(page.locator("text=Redirecting to dashboard...")).toBeVisible()
  318 | 
  319 |     // Wait for redirect to dashboard
  320 |     await page.waitForURL(/dashboard/, { timeout: 15000 })
  321 |     await expect(page).toHaveURL(/dashboard/)
  322 |   })
```