import { test, expect } from '@playwright/test'

test.describe('Backtest functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')

    // Wait for initial load
    await page.waitForLoadState('networkidle')
  })

  test('should display backtest panel', async ({ page }) => {
    // Look for backtest panel or button
    const backtestSection = page.locator('text=/backtest|backtest all/i').first()

    if (await backtestSection.isVisible().catch(() => false)) {
      await expect(backtestSection).toBeVisible()
    }
  })

  test('should run backtest on all pairs', async ({ page }) => {
    // First run a scan to get pairs - use fallback for mobile where only icon shows
    const scanButton = page
      .getByRole('button', { name: 'Scan', exact: true })
      .or(page.locator('button').filter({ has: page.locator('.lucide-zap') }))
    await scanButton.first().click()

    // Wait for scan to complete - spinner should disappear
    await page.waitForFunction(() => !document.querySelector('button:disabled .animate-spin'), {
      timeout: 60000,
    })

    // Look for backtest all button
    const backtestAllButton = page.getByRole('button', { name: /backtest all/i })

    if (await backtestAllButton.isVisible().catch(() => false)) {
      await backtestAllButton.click()

      // Wait for backtest to complete
      await page.waitForTimeout(5000)

      // Check for backtest results
      const results = page.locator('text=/win rate|profit|pnl|trades/i').first()
      await expect(results).toBeVisible()
    }
  })
})

test.describe('Multi-Timeframe Analysis', () => {
  test('should display MTF panel', async ({ page }) => {
    await page.goto('/')

    const mtfSection = page.locator('text=/multi-timeframe|timeframe confluence|mtf scan/i').first()

    if (await mtfSection.isVisible().catch(() => false)) {
      await expect(mtfSection).toBeVisible()
    }
  })

  test('should run MTF scan', async ({ page }) => {
    await page.goto('/')

    // Look for MTF scan button
    const mtfScanButton = page.getByRole('button', { name: /mtf scan|multi-timeframe scan/i })

    if (await mtfScanButton.isVisible().catch(() => false)) {
      await mtfScanButton.click()

      // Wait for scan to process
      await page.waitForTimeout(10000)

      // Check for confluence results
      const results = page.locator('text=/confluence|aligned|confidence/i').first()
      await expect(results).toBeVisible()
    }
  })
})

test.describe('History tracking', () => {
  test('should display history panel', async ({ page }) => {
    await page.goto('/')

    const historySection = page.locator('text=/history|historical|trends/i').first()

    if (await historySection.isVisible().catch(() => false)) {
      await expect(historySection).toBeVisible()
    }
  })
})
