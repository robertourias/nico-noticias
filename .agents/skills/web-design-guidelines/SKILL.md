---
name: web-design-guidelines
description: Reviews UI code (HTML, CSS, React/Next.js, Tailwind) against Web Interface Guidelines covering accessibility, focus states, forms, animation, typography, images, dark mode, i18n and hydration safety, and reports terse file:line findings. Use this skill whenever the user asks to review my UI, check accessibility, audit design, review UX, or check a site or component against best practices, even if "guidelines" is never mentioned. Not for performance audits, SEO, or full site audits.
metadata:
  title: Web Design Guidelines
  category: design
  tags: [ui, accessibility, ux, review, css, react]
  agents: [claude-code, cursor, codex]
  version: 1.0.0
  status: beta
  language: en
  visibility: public
  updated: 2026-09-25
---

# Web Design Guidelines

Audit UI code against a fixed rule set (Vercel's Web Interface Guidelines) and report violations as clickable `file:line` findings. The rules live in `references/guideline.md`; load it every time, since it holds both the rules and the exact output format.

## Workflow

1. Read `references/guideline.md`.
2. Resolve targets: use the file(s) or glob the user gave. If none, ask which files to review; do not scan the whole repo unprompted.
3. Read each target file fully so line numbers are accurate.
4. Check every rule category that applies to the file type (skip e.g. Hydration Safety for plain HTML, Images for files with no `<img>`).
5. Report using the guideline's output format.

## Output rules

- Group by file; one line per finding: `path:line - issue` (add the fix only when non-obvious).
- Files with no findings get `✓ pass`.
- No preamble, no summary, no praise. Signal over grammar.
- Flag the anti-patterns list in the guideline even when the surrounding code looks intentional; the user can dismiss them.

## Scope

Visual design and interaction patterns only. Route elsewhere when the request is about:

- load speed / Core Web Vitals → performance audit tooling
- search ranking → SEO tooling
- whole-site audit → a comprehensive quality audit

Keep to the rules in the guideline; do not invent new ones or rewrite code unless the user asks for fixes after the report.

## Credits

Rules adapted from Vercel's `web-design-guidelines` skill (Web Interface Guidelines).
