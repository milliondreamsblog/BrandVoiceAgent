# BrandVoiceAgent

An AI-powered voice critic that judges social media drafts against a 19-rule brand voice system built for Bricx Labs.

## Features

- **Critic** — paste any draft and get a rule-by-rule verdict with a minimal in-voice rewrite
- **Game** — pick the better version from real before/after pairs to train your eye
- **Library** — browse approved posts with the rules behind each one
- **Review Queue** — push rewrites from chat; the content lead picks the best version

## Stack

- Next.js 15 App Router with TypeScript
- Anthropic Claude (claude-opus-4-8) via structured JSON output
- Vercel Blob for review queue draft storage
- TanStack Table for library pagination

## Getting started

1. Copy `.env.local.example` to `.env.local` and fill in your API key
2. `npm install`
3. `npm run dev`
