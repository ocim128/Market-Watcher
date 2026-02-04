# Testing Guide

This project uses **Vitest** for unit/integration testing and **Playwright** for E2E testing.

## Quick Start

```bash
# Run all tests (unit + e2e)
npm run test:all

# Run only unit tests
npm test

# Run only E2E tests
npm run test:e2e
```

## Unit Tests (Vitest)

Unit tests are located alongside the source files with the `.test.ts` or `.test.tsx` extension.

### Running Unit Tests

```bash
# Run all unit tests once
npm test

# Run tests in watch mode (recommended during development)
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npx vitest run --coverage
```

### Writing Unit Tests

Tests should be placed next to the file they test:

```
src/
├── lib/
│   ├── utils.ts
│   └── utils.test.ts          # Test for utils.ts
├── components/
│   └── ui/
│       ├── button.tsx
│       └── button.test.tsx    # Test for button.tsx
```

Example test structure:

```typescript
import { describe, it, expect } from 'vitest'
import { myFunction } from './my-module'

describe('myFunction', () => {
    it('should do something', () => {
        const result = myFunction('input')
        expect(result).toBe('expected output')
    })

    it('should handle edge cases', () => {
        expect(() => myFunction(null)).toThrow()
    })
})
```

### Testing React Components

Use `@testing-library/react` for component testing:

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MyComponent } from './my-component'

describe('MyComponent', () => {
    it('renders correctly', () => {
        render(<MyComponent />)
        expect(screen.getByText('Hello')).toBeInTheDocument()
    })

    it('handles user interactions', () => {
        render(<MyComponent />)
        fireEvent.click(screen.getByRole('button'))
        expect(screen.getByText('Clicked!')).toBeInTheDocument()
    })
})
```

### Mocking

Use `vi` from Vitest for mocking:

```typescript
import { vi } from 'vitest'

// Mock a module
vi.mock('@/hooks/use-scan', () => ({
    useScan: () => ({
        scan: vi.fn(),
        isScanning: false,
    }),
}))

// Mock a function
const mockFn = vi.fn()
mockFn.mockReturnValue('mocked value')
```

## E2E Tests (Playwright)

E2E tests are located in the `e2e/` directory.

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI mode
npm run test:e2e:ui

# Run E2E tests in debug mode
npm run test:e2e:debug

# Run E2E tests for specific file
npx playwright test e2e/dashboard.spec.ts

# Run E2E tests on specific browser
npx playwright test --project=chromium
```

### Writing E2E Tests

E2E tests simulate real user interactions:

```typescript
import { test, expect } from '@playwright/test'

test('user can scan for opportunities', async ({ page }) => {
    await page.goto('/')
    
    // Click the scan button
    await page.getByRole('button', { name: /scan/i }).click()
    
    // Wait for scanning to complete
    await page.waitForSelector('button:has-text("Scan")', { timeout: 60000 })
    
    // Verify results are displayed
    await expect(page.locator('table tbody tr').first()).toBeVisible()
})
```

### E2E Best Practices

1. **Use semantic selectors**: Prefer `getByRole`, `getByText` over CSS selectors
2. **Wait for network idle**: Use `page.waitForLoadState('networkidle')` after navigation
3. **Use timeouts wisely**: API calls might take time, adjust timeouts accordingly
4. **Test user flows**: Test complete user journeys, not just individual elements

### Test Data

E2E tests use the real Binance API. Tests are designed to:
- Handle loading states
- Wait for API responses
- Work with real market data

## Test Configuration

### Vitest Configuration

See `vitest.config.ts`:
- Environment: `jsdom` (browser-like)
- Globals: enabled (no need to import `describe`, `it`, etc.)
- Setup file: `src/test/setup.ts`

### Playwright Configuration

See `playwright.config.ts`:
- Browsers: Chromium, Firefox, WebKit
- Mobile: Pixel 5, iPhone 12
- Base URL: `http://localhost:3000`
- Auto-start dev server: enabled

## CI/CD Integration

Tests are designed to run in CI environments:

```bash
# Run all tests (used in CI)
npm run test:all

# Run with coverage
npm run test -- --coverage
```

## Debugging Tests

### Unit Tests

```bash
# Debug specific test file
npx vitest --reporter=verbose src/lib/utils.test.ts

# Debug with Node inspector
node --inspect-brk node_modules/vitest/vitest.mjs --run
```

### E2E Tests

```bash
# Run in headed mode (see browser)
npx playwright test --headed

# Run in debug mode
npx playwright test --debug

# Open Playwright inspector
npx playwright test --ui
```

## Coverage

To generate test coverage reports:

```bash
# Unit test coverage
npx vitest run --coverage

# Coverage will be output to terminal and saved to coverage/ directory
```

Coverage configuration excludes:
- `node_modules/`
- `src/test/`
- `**/*.d.ts`
- `**/*.config.*`

## Troubleshooting

### Common Issues

**E2E tests fail with "page.goto: net::ERR_CONNECTION_REFUSED"**
- Make sure the dev server is running or Playwright is configured to start it automatically

**Unit tests fail with "ReferenceError: document is not defined"**
- Check that the test file uses `jsdom` environment (configured globally in vitest.config.ts)

**Playwright tests timeout**
- Increase timeout in `playwright.config.ts` or use `test.setTimeout()` for specific tests

**Tests pass locally but fail in CI**
- Check for race conditions
- Ensure all async operations are properly awaited
- Verify test data doesn't depend on external state
