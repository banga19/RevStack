# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pricing-to-checkout.spec.ts >> Pricing → PaymentCheckout → Success >> navigates from pricing to signup when not authenticated
- Location: e2e/pricing-to-checkout.spec.ts:324:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Test source

```ts
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
  323 | 
  324 |   test("navigates from pricing to signup when not authenticated", async ({ page }) => {
  325 |     await blockBackgroundRequests(page)
  326 |     await page.goto(`${BASE_URL}/pricing`, { waitUntil: "load" })
  327 |     await dismissCookieConsent(page)
  328 | 
  329 |     const choosePlanButton = page.locator("button", { hasText: "Choose Plan" }).first()
  330 |     await expect(choosePlanButton).toBeVisible({ timeout: 10000 })
  331 |     await choosePlanButton.click()
  332 | 
> 333 |     await page.waitForURL(/signup/, { timeout: 10000 })
      |                ^ TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
  334 |     await expect(page).toHaveURL(/signup/)
  335 |   })
  336 | 
  337 |   test("toggles between monthly and yearly billing on pricing page", async ({ page }) => {
  338 |     await blockBackgroundRequests(page)
  339 |     await page.goto(`${BASE_URL}/pricing`, { waitUntil: "load" })
  340 |     await dismissCookieConsent(page)
  341 | 
  342 |     const yearlyToggle = page.locator("button", { hasText: "Yearly" })
  343 |     await yearlyToggle.click()
  344 | 
  345 |     await expect(page.getByText("$500", { exact: true }).first()).toBeVisible()
  346 |     await expect(page.getByText("$2000", { exact: true }).first()).toBeVisible()
  347 |     await expect(page.getByText("$5000", { exact: true }).first()).toBeVisible()
  348 | 
  349 |     const monthlyToggle = page.locator("button", { hasText: "Monthly" })
  350 |     await monthlyToggle.click()
  351 | 
  352 |     await expect(page.getByText("$50", { exact: true }).first()).toBeVisible()
  353 |     await expect(page.getByText("$200", { exact: true }).first()).toBeVisible()
  354 |     await expect(page.getByText("$500", { exact: true }).first()).toBeVisible()
  355 |   })
  356 | 
  357 |   test("selects M-Pesa payment method and fills phone number", async ({ page }) => {
  358 |     await loginAsTestUser(page)
  359 |     await page.goto(`${BASE_URL}/pricing`, { waitUntil: "load" })
  360 |     await dismissCookieConsent(page)
  361 | 
  362 |     // Wait for Choose Plan to be visible (session loaded)
  363 |     const choosePlanButton = page.locator("button", { hasText: "Choose Plan" }).first()
  364 |     await expect(choosePlanButton).toBeVisible({ timeout: 15000 })
  365 |     await choosePlanButton.click()
  366 | 
  367 |     await expect(page.locator('[data-testid="payment-method-selection"]')).toBeVisible({ timeout: 5000 })
  368 | 
  369 |     await page.locator("button", { hasText: "M-Pesa" }).click()
  370 | 
  371 |     await expect(page.locator("text=Pay with M-Pesa")).toBeVisible()
  372 |     await expect(page.locator("#phone")).toBeVisible()
  373 | 
  374 |     await page.locator("#phone").fill("254712345678")
  375 | 
  376 |     const payButton = page.locator("button", { hasText: /Pay \$50 via M-Pesa/ })
  377 |     await expect(payButton).toBeEnabled()
  378 |   })
  379 | 
  380 |   test("shows error state when initiate payment fails", async ({ page }) => {
  381 |     await loginAsTestUser(page)
  382 |     await page.goto(`${BASE_URL}/pricing`, { waitUntil: "load" })
  383 |     await dismissCookieConsent(page)
  384 | 
  385 |     const choosePlanButton = page.locator("button", { hasText: "Choose Plan" }).first()
  386 |     await expect(choosePlanButton).toBeVisible({ timeout: 15000 })
  387 |     await choosePlanButton.click()
  388 | 
  389 |     await expect(page.locator('[data-testid="payment-method-selection"]')).toBeVisible({ timeout: 5000 })
  390 | 
  391 |     await page.locator("button", { hasText: "Credit / Debit Card" }).click()
  392 | 
  393 |     await page.locator("#cardNumber").fill("4242 4242 4242 4242")
  394 |     const yearOptions = getYearOptions()
  395 |     await page.locator("label", { hasText: "Expiry" })
  396 |       .locator("..")
  397 |       .locator("select")
  398 |       .first()
  399 |       .selectOption("12")
  400 |     await page.locator("label", { hasText: "Expiry" })
  401 |       .locator("..")
  402 |       .locator("select")
  403 |       .nth(1)
  404 |       .selectOption(yearOptions[3])
  405 |     await page.locator("#cvv").fill("123")
  406 | 
  407 |     await page.route("**/api/payments/initiate", async (route: Route) => {
  408 |       await route.fulfill({
  409 |         status: 400,
  410 |         contentType: "application/json",
  411 |         body: JSON.stringify({ error: "Card declined. Please try a different card." }),
  412 |       })
  413 |     })
  414 | 
  415 |     const payButton = page.locator('[data-testid="pay-button"]')
  416 |     await payButton.click()
  417 | 
  418 |     const errorState = page.locator('[data-testid="payment-error"]')
  419 |     await expect(errorState).toBeVisible({ timeout: 10000 })
  420 |     await expect(errorState.locator("text=Payment Failed")).toBeVisible()
  421 |     await expect(errorState.locator("text=Card declined. Please try a different card.")).toBeVisible()
  422 | 
  423 |     const tryAgainButton = errorState.locator('[data-testid="back-button"]')
  424 |     await expect(tryAgainButton).toBeVisible()
  425 |   })
  426 | })
  427 | 
```