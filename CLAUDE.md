# Cyrano Clips

AI video editor. Chat-forward web app where Claude Code is the editing backend.

## Architecture

```
React/Vite frontend (5173) → Express backend (3001) → Claude Agent SDK → Claude Code
                                                    → Modal (WhisperX transcription)
```

- **Frontend**: React 18 + TypeScript + Vite + Zustand. No component libraries. Inline styles with CSS custom properties.
- **Backend**: Node.js + Express + TypeScript. Thin relay — no editing logic. The Agent SDK spawns Claude Code which does all the real work.
- **Agent**: Claude Sonnet 4.6 via `@anthropic-ai/claude-agent-sdk`. Subscription auth, no API keys. `bypassPermissions` mode. Each project gets a persistent session (`session_id` in `project.json`).
- **Transcription**: WhisperX on Modal GPU. Called via Python subprocess from Node.
- **Storage**: Filesystem only. `~/cyrano-clips-data/projects/{uuid}/`. No database, no auth.

## Project layout

```
shared/types.ts          — Project, Clip, Timeline, Transcript, SSEEvent
backend/src/index.ts     — Express entry, port 3001
backend/src/routes/      — chat (SSE), projects, upload, timeline, media, exports
backend/src/services/    — storage (filesystem), claude-session, transcription
backend/src/prompts/     — system prompt (Cyrano editor persona)
frontend/src/            — App, stores, api/client, components
modal/transcribe.py      — WhisperX pipeline on Modal
```

## How to run

```
# Terminal 1
cd backend && npx tsx src/index.ts

# Terminal 2
cd frontend && npx vite
```

Or just double-click `start.bat`.

## Key design decisions

- The backend NEVER parses or manipulates timelines. Claude writes them directly to disk.
- Chat route streams SSE events translated from SDK messages (text_delta, activity_start, tool_progress, result, etc).
- Video playback is virtual — seeks the source video to clip timestamps, no pre-rendering.
- Timeline workspace uses flexbox proportional layout, not absolute positioning.
- Undo/redo is conversational ("undo that") — no special endpoints.
- The system prompt in `backend/src/prompts/system.ts` is the single most important file for edit quality.

## Rules

- No component libraries (no shadcn, MUI, Chakra).
- Dark theme: `#0a0a0a` root, `#141414` surface, `#7c5cfc` accent, `#e24b4a` playhead.
- Fonts: DM Sans (UI), JetBrains Mono (code/timecodes).
- Model is `claude-sonnet-4-6` to save credits. Don't change to Opus without asking.
- Don't add auth or a database. Filesystem storage only.
- Don't refactor the system prompt without testing the editing output.
