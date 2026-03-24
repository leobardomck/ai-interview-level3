# Challenge 03 — Production Debugging

## Time: 60 minutes

## Scenario

You have been paged. The e-commerce API has been experiencing issues for the past
2 hours. Customer support is receiving complaints about:

- **Wrong orders** — customers seeing orders they did not place
- **Failed charges** — payments going through but orders not appearing
- **Intermittent errors** — some requests failing unpredictably

Your job is to **diagnose and fix** the issues. You have access to:

1. **Source code** — The full Express.js application in `src/`
2. **Application logs** — `logs/app.log` (general application logs)
3. **Error logs** — `logs/error.log` (errors and exceptions)
4. **Metrics dashboard** — `metrics/dashboard.json` (monitoring snapshot)
5. **Integration tests** — `__tests__/integration.test.js` (some failing)

## Instructions

1. Start by reviewing the available evidence (logs, metrics, tests)
2. Run the integration tests to see what is failing: `npm run test:03`
3. Diagnose each issue — find the root cause in the source code
4. Fix each bug
5. Re-run tests to verify your fixes
6. Fill out the incident report (see template below)

## Incident Report Template

Create a file called `incident-report.md` with the following:

```markdown
# Incident Report

## Summary
[1-2 sentence summary of the incident]

## Timeline
- [When did it start?]
- [When was it detected?]
- [When was it resolved?]

## Root Causes

### Issue 1: [Title]
- **Symptom**: [What users/metrics showed]
- **Root cause**: [Technical explanation]
- **Fix**: [What you changed]
- **File(s)**: [Which files were modified]

### Issue 2: [Title]
...

## Impact
- [Number of affected users/orders]
- [Business impact]

## Prevention
- [What changes would prevent this in the future?]
```

## What We Evaluate

- **Methodology**: Do you start with logs/metrics or dive into code?
- **Systematic triage**: How do you prioritize which issues to investigate first?
- **Root cause analysis**: Do you find the actual cause or just patch symptoms?
- **Completeness**: Do you find all the issues?
- **Interconnections**: Do you understand how the bugs relate to each other?
- **AI usage**: How do you leverage AI for debugging vs. manual analysis?

## Running Tests

```bash
# From the repository root:
npm run test:03
```

## Architecture

```
src/
├── server.js          — Express app setup and middleware
├── routes/
│   ├── users.js       — User CRUD endpoints
│   └── orders.js      — Order endpoints
├── middleware/
│   ├── auth.js        — Token-based authentication
│   └── rateLimit.js   — In-memory rate limiting
├── services/
│   ├── userService.js — User database operations
│   ├── orderService.js — Order database operations
│   └── cacheService.js — In-memory caching layer
└── db/
    └── database.js    — SQLite setup and schema
```
