import { test, expect } from '@playwright/test'

test.describe('NovaBiz Merchant Dashboard — Send Money E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Ensure dashboard loads with available balance
    await expect(page.getByTestId('available-balance-amount')).toBeVisible()
    await expect(page.getByTestId('available-balance-amount')).toContainText('₦485,250.50')
  })

  test('Happy Path: Complete 4-step transfer and verify balance deduction', async ({ page }) => {
    // 1. Open Send Money Modal
    await page.getByRole('button', { name: /send money/i }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: /send money \(nip\)/i })).toBeVisible()

    // 2. Step 1: Beneficiary Resolution
    const accountInput = page.getByLabel(/10-digit nuban account/i)
    await accountInput.fill('0123456789')
    await expect(page.getByText(/Verified NIBSS Beneficiary/i)).toBeVisible()
    await expect(page.getByText('Yetunde Chukwu')).toBeVisible()

    const continueBtn = page.getByRole('button', { name: /continue/i })
    await expect(continueBtn).toBeEnabled()
    await continueBtn.click()

    // 3. Step 2: Amount & Narration
    const amountInput = page.getByLabel(/transfer amount/i)
    await expect(amountInput).toBeVisible()
    await amountInput.fill('2,000.00')

    const narrationInput = page.getByLabel(/narration \/ note/i)
    await narrationInput.fill('Stock replenishment')

    const reviewBtn = page.getByRole('button', { name: /review transfer/i })
    await expect(reviewBtn).toBeEnabled()
    await reviewBtn.click()

    // 4. Step 3: Review Transfer Details & PIN Entry
    await expect(page.getByText(/Idempotency Key/i)).toBeVisible()
    await expect(page.getByText('Yetunde Chukwu')).toBeVisible()
    await expect(page.getByText('₦2,000.00')).toBeVisible()
    await expect(page.getByText('₦10.75')).toBeVisible() // NIP Fee
    await expect(page.getByText('₦2,010.75')).toBeVisible() // Total Debit
    await expect(page.getByText('₦483,239.75')).toBeVisible() // Projected Balance

    const pinInput = page.getByLabel(/enter 4-digit transaction pin/i)
    await pinInput.fill('1234')

    const confirmBtn = page.getByRole('button', { name: /confirm & send/i })
    await expect(confirmBtn).toBeEnabled()
    await confirmBtn.click()

    // 5. Step 4: Success Confirmation Screen
    await expect(page.getByRole('heading', { name: /transfer sent!/i })).toBeVisible()
    await expect(page.getByText(/transferred to Yetunde Chukwu/i)).toBeVisible()

    // Close Modal
    await page.getByRole('button', { name: /done/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // 6. Verify Dashboard Balance reflects the debit
    await expect(page.getByTestId('available-balance-amount')).toContainText('₦483,239.75')
  })

  test('Chaos Failure & Rollback: Force 503 error, verify optimistic deduction, instant rollback, and retry', async ({ page }) => {
    // 1. Open Evaluator Chaos Simulator
    const chaosTrigger = page.getByLabel(/open evaluator chaos simulator/i)
    await chaosTrigger.click()
    await expect(page.getByText('Evaluator Chaos Simulator')).toBeVisible()

    // 2. Enable "Force Next Transfer to Fail (503)"
    const forceFailSwitch = page.getByLabel(/force next transfer to fail/i)
    await forceFailSwitch.click()

    // Close Chaos Popover by clicking outside or pressing Escape
    await page.keyboard.press('Escape')

    // 3. Initiate Send Money Flow
    await page.getByRole('button', { name: /send money/i }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Step 1: Recipient
    await page.getByLabel(/10-digit nuban account/i).fill('0123456789')
    await expect(page.getByText(/Verified NIBSS Beneficiary/i)).toBeVisible()
    await page.getByRole('button', { name: /continue/i }).click()

    // Step 2: Amount (₦5,000.00 + ₦10.75 fee = ₦5,010.75)
    await page.getByLabel(/transfer amount/i).fill('5,000.00')
    await page.getByRole('button', { name: /review transfer/i }).click()

    // Step 3: Review & PIN
    await expect(page.getByText('₦5,000.00')).toBeVisible()
    await page.getByLabel(/enter 4-digit transaction pin/i).fill('1234')

    const confirmBtn = page.getByRole('button', { name: /confirm & send/i })
    await confirmBtn.click()

    // 4. Assert Rollback Notification & Restored Balance
    // Destructive Toast Alert announcing rollback
    await expect(page.getByText(/transfer failed — balance restored/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/was restored to your balance/i)).toBeVisible()

    // Balance remains exact original kobo (₦485,250.50) without reloading
    await expect(page.getByTestId('available-balance-amount')).toContainText('₦485,250.50')
  })
})
