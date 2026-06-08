# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: checkout-flow.spec.ts >> Payment Checkout Flow >> navigates to signup when not logged in
- Location: e2e/checkout-flow.spec.ts:334:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('button').filter({ hasText: 'Choose Plan' }).first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('button').filter({ hasText: 'Choose Plan' }).first()

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
```

# Test source

```ts
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
  334 |   test("navigates to signup when not logged in", async ({ page }) => {
  335 |     await blockBackgroundRequests(page)
  336 |     await page.goto(`${BASE_URL}/pricing`, { waitUntil: "load" })
  337 | 
  338 |     // Dismiss cookie consent
  339 |     const cookieAccept = page.locator("button", { hasText: "Accept All Cookies" })
  340 |     if (await cookieAccept.isVisible({ timeout: 2000 }).catch(() => false)) {
  341 |       await cookieAccept.click()
  342 |     }
  343 | 
  344 |     // Click "Choose Plan" should redirect to signup
  345 |     const choosePlanButton = page.locator("button", { hasText: "Choose Plan" }).first()
> 346 |     await expect(choosePlanButton).toBeVisible({ timeout: 10000 })
      |                                    ^ Error: expect(locator).toBeVisible() failed
  347 |     await choosePlanButton.click()
  348 | 
  349 |     // Should redirect to signup with plan/billing params
  350 |     await page.waitForURL(/signup/, { timeout: 10000 })
  351 |     await expect(page).toHaveURL(/signup/)
  352 |   })
  353 | 
  354 |   test("shows mobile money payment form when selected", async ({ page }) => {
  355 |     await loginAsTestUser(page)
  356 |     await blockBackgroundRequests(page)
  357 |     await page.goto(`${BASE_URL}/pricing`, { waitUntil: "load" })
  358 | 
  359 |     // Dismiss cookie consent
  360 |     const cookieAccept = page.locator("button", { hasText: "Accept All Cookies" })
  361 |     if (await cookieAccept.isVisible({ timeout: 2000 }).catch(() => false)) {
  362 |       await cookieAccept.click()
  363 |     }
  364 | 
  365 |     await page.waitForLoadState("networkidle")
  366 | 
  367 |     // Click "Choose Plan" and select M-Pesa
  368 |     const choosePlanButton = page.locator("button", { hasText: "Choose Plan" }).first()
  369 |     await expect(choosePlanButton).toBeVisible({ timeout: 10000 })
  370 |     await choosePlanButton.click()
  371 | 
  372 |     // Use data-testid to find checkout content
  373 |     await expect(page.locator('[data-testid="payment-method-selection"]')).toBeVisible({ timeout: 5000 })
  374 | 
  375 |     // Select M-Pesa
  376 |     await page.locator("button", { hasText: "M-Pesa" }).click()
  377 |     await expect(page.locator("text=Pay with M-Pesa")).toBeVisible()
  378 |     await expect(page.locator("#phone")).toBeVisible()
  379 | 
  380 |     // Fill phone number
  381 |     await page.locator("#phone").fill("254712345678")
  382 | 
  383 |     // Verify pay button is enabled
  384 |     const payButton = page.locator("button", { hasText: /Pay \$50 via M-Pesa/ })
  385 |     await expect(payButton).toBeEnabled()
  386 |   })
  387 | })
  388 | 
```