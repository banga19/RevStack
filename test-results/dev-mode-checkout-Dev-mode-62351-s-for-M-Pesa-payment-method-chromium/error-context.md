# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dev-mode-checkout.spec.ts >> Dev-mode simulated checkout flow >> shows processing then success for M-Pesa payment method
- Location: e2e/dev-mode-checkout.spec.ts:320:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Test source

```ts
  291 |       } else {
  292 |         await route.fulfill({
  293 |           status: 200,
  294 |           contentType: "application/json",
  295 |           body: JSON.stringify({ status: "pending", tier: "starter", plan: "monthly" }),
  296 |         })
  297 |       }
  298 |     })
  299 | 
  300 |     // ── Step 10: Click Pay button to trigger the payment ─────────────
  301 |     await payButton.click()
  302 | 
  303 |     // ── Step 11: Verify processing state appears ─────────────────────
  304 |     await expect(page.locator('[data-testid="payment-processing"]')).toBeVisible({ timeout: 5000 })
  305 |     await expect(page.locator("text=Processing Payment")).toBeVisible()
  306 |     await expect(page.locator("text=Processing your card payment")).toBeVisible()
  307 | 
  308 |     // ── Step 12: Verify success state after polling resolves ─────────
  309 |     await expect(page.locator('[data-testid="payment-success"]')).toBeVisible({ timeout: 30000 })
  310 | 
  311 |     await expect(page.locator("text=Payment Successful! 🎉")).toBeVisible()
  312 |     await expect(page.locator("text=Starter (monthly) subscription is now active")).toBeVisible()
  313 |     await expect(page.locator("text=Redirecting to dashboard...")).toBeVisible()
  314 | 
  315 |     // ── Step 13: Wait for redirect to dashboard ──────────────────────
  316 |     await page.waitForURL(/dashboard/, { timeout: 15000 })
  317 |     await expect(page).toHaveURL(/dashboard/)
  318 |   })
  319 | 
  320 |   test("shows processing then success for M-Pesa payment method", async ({ page }) => {
  321 |     // ── Authenticate and open pricing ─────────────────────────────────
  322 |     await loginAsTestUser(page)
  323 |     await page.goto(`${BASE_URL}/pricing`, { waitUntil: "load" })
  324 |     await dismissCookieConsent(page)
  325 | 
  326 |     const choosePlanButton = page.locator("button", { hasText: "Choose Plan" }).first()
  327 |     await expect(choosePlanButton).toBeVisible({ timeout: 15000 })
  328 | 
  329 |     // Open dialog and select M-Pesa
  330 |     await choosePlanButton.click()
  331 | 
  332 |     await expect(page.locator('[data-testid="payment-method-selection"]')).toBeVisible({ timeout: 5000 })
  333 | 
  334 |     await page.locator("button", { hasText: "M-Pesa" }).click()
  335 | 
  336 |     // Verify M-Pesa form
  337 |     await expect(page.locator("text=Pay with M-Pesa")).toBeVisible()
  338 |     await expect(page.locator("#phone")).toBeVisible()
  339 | 
  340 |     // Fill phone
  341 |     await page.locator("#phone").fill("254712345678")
  342 | 
  343 |     // Verify Pay button enabled
  344 |     const payButton = page.locator("button", { hasText: /Pay \$50 via M-Pesa/ })
  345 |     await expect(payButton).toBeEnabled()
  346 | 
  347 |     // Intercept API calls for M-Pesa simulation
  348 |     const MOCK_TX_REF = `devmode-mpesa-${Date.now()}`
  349 | 
  350 |     await page.route("**/api/payments/initiate", async (route: Route) => {
  351 |       await route.fulfill({
  352 |         status: 200,
  353 |         contentType: "application/json",
  354 |         body: JSON.stringify({
  355 |           success: true,
  356 |           paymentId: `devmode-mpesa-pay-1`,
  357 |           txRef: MOCK_TX_REF,
  358 |           authUrl: undefined,
  359 |         }),
  360 |       })
  361 |     })
  362 | 
  363 |     let mpesaPollCount = 0
  364 |     await page.route("**/api/payments/status**", async (route: Route) => {
  365 |       mpesaPollCount++
  366 |       if (mpesaPollCount >= 2) {
  367 |         await route.fulfill({
  368 |           status: 200,
  369 |           body: JSON.stringify({ status: "success", tier: "starter", plan: "monthly" }),
  370 |         })
  371 |       } else {
  372 |         await route.fulfill({
  373 |           status: 200,
  374 |           body: JSON.stringify({ status: "pending" }),
  375 |         })
  376 |       }
  377 |     })
  378 | 
  379 |     // Click Pay
  380 |     await payButton.click()
  381 | 
  382 |     // Verify processing with M-Pesa specific message
  383 |     await expect(page.locator('[data-testid="payment-processing"]')).toBeVisible({ timeout: 5000 })
  384 |     await expect(page.locator("text=M-Pesa STK Push")).toBeVisible()
  385 | 
  386 |     // Verify success
  387 |     await expect(page.locator('[data-testid="payment-success"]')).toBeVisible({ timeout: 30000 })
  388 |     await expect(page.locator("text=Payment Successful! 🎉")).toBeVisible()
  389 | 
  390 |     // Wait for dashboard redirect
> 391 |     await page.waitForURL(/dashboard/, { timeout: 15000 })
      |                ^ TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
  392 |   })
  393 | 
  394 |   test("shows error state when payment initiation fails", async ({ page }) => {
  395 |     await loginAsTestUser(page)
  396 |     await page.goto(`${BASE_URL}/pricing`, { waitUntil: "load" })
  397 |     await dismissCookieConsent(page)
  398 | 
  399 |     const choosePlanButton = page.locator("button", { hasText: "Choose Plan" }).first()
  400 |     await expect(choosePlanButton).toBeVisible({ timeout: 15000 })
  401 |     await choosePlanButton.click()
  402 | 
  403 |     await expect(page.locator('[data-testid="payment-method-selection"]')).toBeVisible({ timeout: 5000 })
  404 | 
  405 |     // Select card
  406 |     await page.locator("button", { hasText: "Credit / Debit Card" }).click()
  407 | 
  408 |     // Fill card details
  409 |     await page.locator("#cardNumber").fill("4242 4242 4242 4242")
  410 |     const yearOptions = getYearOptions()
  411 |     await page.locator("label", { hasText: "Expiry" })
  412 |       .locator("..")
  413 |       .locator("select")
  414 |       .first()
  415 |       .selectOption("12")
  416 |     await page.locator("label", { hasText: "Expiry" })
  417 |       .locator("..")
  418 |       .locator("select")
  419 |       .nth(1)
  420 |       .selectOption(yearOptions[3])
  421 |     await page.locator("#cvv").fill("123")
  422 | 
  423 |     // Intercept initiate endpoint to return a failure
  424 |     await page.route("**/api/payments/initiate", async (route: Route) => {
  425 |       await route.fulfill({
  426 |         status: 400,
  427 |         contentType: "application/json",
  428 |         body: JSON.stringify({ error: "Card declined. Please try a different card." }),
  429 |       })
  430 |     })
  431 | 
  432 |     // Click Pay
  433 |     const payButton = page.locator('[data-testid="pay-button"]')
  434 |     await payButton.click()
  435 | 
  436 |     // Verify error state
  437 |     const errorState = page.locator('[data-testid="payment-error"]')
  438 |     await expect(errorState).toBeVisible({ timeout: 10000 })
  439 |     await expect(errorState.locator("text=Payment Failed")).toBeVisible()
  440 |     await expect(errorState.locator("text=Card declined. Please try a different card.")).toBeVisible()
  441 | 
  442 |     // Verify Try Again button is present
  443 |     const tryAgainButton = errorState.locator('[data-testid="back-button"]')
  444 |     await expect(tryAgainButton).toBeVisible()
  445 |     await expect(tryAgainButton).toContainText("Try Again")
  446 |   })
  447 | })
  448 | 
```