# Challenge 02 — Legacy Code Migration

## Scenario

You have inherited two legacy Node.js modules that use outdated patterns:
- **callbackApi.js** — Data-fetching module using nested callbacks (callback hell)
- **xmlParser.js** — XML string processing using regex and procedural string manipulation

Your job is to migrate these to modern equivalents:
- **asyncApi.js** — Same business logic using async/await and Promises
- **jsonTransformer.js** — Same data transformations but working with JSON

## Instructions

1. Start by reading and understanding the legacy code in `src/legacy/`
2. Run the legacy tests to verify the current behavior: `npm test -- __tests__/legacy.test.js`
3. Read the modern test file to understand the target behavior: `__tests__/modern.test.js`
4. Implement the modern modules in `src/modern/` — stubs are already in place
5. Run modern tests to verify your implementation: `npm test -- __tests__/modern.test.js`

## Key Constraints

- The **legacy tests define current behavior** — they all pass and serve as the behavioral spec
- The **modern tests define target behavior** — they all fail initially; your job is to make them pass
- Your modern implementation must preserve the same business logic and edge cases as the legacy code
- Do NOT modify the legacy code or the test files

## What We Evaluate

- **Comprehension**: Do you understand the legacy code before migrating?
- **Behavioral preservation**: Do you maintain all edge cases and business logic?
- **Modern patterns**: Do you properly use async/await, Promise.all, try/catch?
- **Verification approach**: Do you run legacy tests first to understand behavior?
- **AI usage**: How do you use AI to understand complex callback patterns?

## Running Tests

```bash
# From the repository root:

# Legacy tests (should all pass)
npm run test:02:legacy

# Modern tests (should fail until you implement the stubs)
npm run test:02:modern

# All Challenge 02 tests
npm run test:02
```
