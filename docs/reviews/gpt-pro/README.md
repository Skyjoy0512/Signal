# GPT PRO Review Prompts

This folder stores reusable review prompts for periodic GPT PRO repository reviews.

## Files

- `2026-06-22-multidimensional-review-prompt.txt`
  - Full repository review prompt covering frontend, backend, analysis logic, refactoring, tests, and feature recommendations.
- `2026-06-23-codex-implementation-status.md`
  - Current implementation and verification status after applying the review pack.

## Review Cadence

For periodic reviews, create a new dated prompt file in this folder and keep the output from GPT PRO alongside it when useful.

Run this command before each external review to create a dated prompt, manifest, and downloadable zip:

```bash
npm run review:pack
```

To regenerate a specific review date:

```bash
REVIEW_DATE=YYYY-MM-DD npm run review:pack
```

Suggested naming:

- `YYYY-MM-DD-multidimensional-review-prompt.txt`
- `YYYY-MM-DD-gpt-pro-review-output.md`
- `YYYY-MM-DD-codex-implementation-instructions.md`
- `signal-gpt-pro-review-pack-YYYY-MM-DD.zip`
