# AI-Assisted Engineering Interview — Level 3: AI Architecture

## Overview

This is Level 3 of the AI-assisted engineering interview series. It assumes you have
demonstrated strong AI tool proficiency in Levels 1 and 2, and now tests your ability
to apply AI tools to real-world engineering scenarios that require deep judgment,
systematic thinking, and architectural decision-making.

Level 3 focuses on **engineering judgment** — knowing when to use AI, when to think
manually, and how to verify AI-generated output in high-stakes situations.

## Challenges

| # | Challenge | Time | What It Tests |
|---|-----------|------|---------------|
| 01 | System Design & Implementation | 60 min | Designing and building a service from a spec using AI |
| 02 | Legacy Code Migration | 45 min | Understanding legacy code and migrating to modern patterns |
| 03 | Production Debugging | 60 min | Diagnosing and fixing interconnected bugs in a live system |

**Total time: approximately 2-3 hours** (60 + 45 + 60 minutes)

## What We Evaluate

- **Problem decomposition**: How you break complex tasks into manageable steps
- **AI delegation**: What you hand to AI vs. what you reason through yourself
- **Verification**: How you validate AI output — do you test incrementally or only at the end?
- **Architectural thinking**: The structural decisions you make when designing systems
- **Debugging methodology**: How you systematically triage production incidents
- **Edge case awareness**: Whether you catch subtle issues that AI might miss

## Setup

```bash
# Install root dependencies
npm install

# Each challenge has its own setup — see its README for details
```

## Running Tests

```bash
# Challenge 02 — Legacy tests (should all pass)
npm run test:02:legacy

# Challenge 02 — Modern tests (should all fail until implemented)
npm run test:02:modern

# Challenge 03 — Integration tests (mix of pass/fail)
npm run test:03
```

## Structure

```
ai-interview-level3/
├── challenges/
│   ├── 01-system-design/       — Build a Bookmark API from spec
│   ├── 02-legacy-migration/    — Migrate callback-based code to async/await
│   └── 03-production-debugging/ — Find and fix 5 production bugs
├── package.json
└── README.md
```

## Guidelines

- You may use any AI tools available to you (Copilot, ChatGPT, Claude, etc.)
- You may reference documentation, Stack Overflow, or any online resource
- The interviewer will observe your process, not just the end result
- Commit frequently so we can see your progression
- Ask clarifying questions if a requirement is ambiguous
