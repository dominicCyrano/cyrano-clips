# Cyrano Clips v2 — Handoff for Remaining Work

## What's Done

### Backend (100% complete for Phase 1-2)
- `backend/src/index.ts` — Express server, port 3001, CORS, all routes mounted
- `backend/src/routes/projects.ts` — Create, list, get projects (filesystem-based)
- `backend/src/routes/upload.ts` — Multipart upload + FFmpeg audio extraction
- `backend/src/routes/chat.ts` — **THE core route**: POST /chat → SSE stream from Claude Agent SDK (model: claude-sonnet-4-6, bypassPermissions, maxTurns 30)
- `backend/src/routes/timeline.ts` — Serve latest.json, transcript, speaker map
- `backend/src/routes/media.ts` — Video streaming with Range headers
- `backend/src/routes/exports.ts` — List/download rendered files
- `backend/src/services/storage.ts` — Filesystem helpers (project dirs, JSON read/write)
- `backend/src/services/claude-session.ts` — Session ID management (in-memory + disk persistence)
- `backend/src/prompts/system.ts` — Full Cyrano editorial system prompt

**Tested end-to-end**: Created a project, put a transcript in, sent chat messages, got streaming SSE events, Claude wrote timeline files, session resume works.

### Frontend (Pass 2 of 5 complete — compiles clean, needs 3 more revision passes)
- `frontend/src/index.css` — CSS variables, animations (pulse, spin), hover utilities, scrollbar styles
- `frontend/src/main.tsx` — React entry
- `frontend/src/App.tsx` — Routes between WelcomeScreen and EditorLayout
- `frontend/src/api/client.ts` — All API functions + SSE streaming generator
- `frontend/src/stores/useProjectStore.ts` — Project state (id, name, status)
- `frontend/src/stores/useChatStore.ts` — Chat state (messages, activities, timeline cards, streaming)
- `frontend/src/components/ErrorBoundary.tsx` — Class component error boundary
- `frontend/src/components/WelcomeScreen.tsx` — Create project + upload video
- `frontend/src/components/EditorLayout.tsx` — Header + Chat + Sidebar + TranscriptDrawer layout
- `frontend/src/components/ChatPanel.tsx` — Main chat interface with suggestion pills, streaming, SSE event handling
- `frontend/src/components/ChatBubble.tsx` — React.memo'd bubble with inline activities (spinner/checkmark), text with basic markdown (**bold**, `code`), timeline cards
- `frontend/src/components/Sidebar.tsx` — Video preview + mini timeline + exports list (polls every 3s)
- `frontend/src/components/TranscriptDrawer.tsx` — Collapsible transcript with speaker colors

## What's Left — Frontend Revision Passes 3-5

### Revision 3 — Functional Polish
1. **Sidebar should NOT poll every 3s** — Instead, expose a `refreshTimeline` callback that ChatPanel calls when it receives a `result` SSE event. Lift timeline state up or use a simple event emitter.
2. **Cleanup on unmount** — ChatPanel's AbortController should abort on component unmount (add useEffect cleanup)
3. **Suggestion pills should disappear** after the first message is sent (they're only for empty state but the state check is fine — just verify it works)
4. **Streaming indicator position** — The "Cyrano is thinking..." should appear only before text starts arriving. Once text deltas come in, the bubble itself shows the streaming. Remove the streaming indicator div or only show it before any text.
5. **Auto-scroll refinement** — Currently scrolls on every message array change. Should only auto-scroll if user was already at the bottom (don't hijack scroll position when user scrolled up to read)

### Revision 4 — Visual Polish
1. **Markdown tables** — Claude's responses include `| # | Clip | ... |` markdown tables. The renderText function only handles **bold** and `code`. Add a simple table renderer or at minimum make tables readable (monospace block).
2. **Empty assistant bubble** — When assistant message starts, it's empty (no text yet). Show a subtle typing indicator instead of blank space.
3. **Timeline clip colors in sidebar** — Should be proportional width based on clip duration (already implemented) but verify it looks good with real data.
4. **Sidebar sections** — Add subtle section dividers and collapse/expand toggles (click section label to toggle).
5. **Welcome screen animation** — Subtle fade-in on the logo and card elements.
6. **Focus management** — Auto-focus the input after a message completes streaming.

### Revision 5 — Edge Cases & Hardening
1. **Error states** — If chat POST fails (server down, network error), show a retry button in the chat.
2. **Upload progress** — WelcomeScreen currently says "Uploading..." with no progress. Consider using XHR for progress tracking or at minimum show a spinner animation.
3. **Long messages** — Test with very long Claude responses. Ensure scroll performance is fine.
4. **Window resize** — Verify layout doesn't break on narrow screens. Consider hiding sidebar by default below 1024px width.
5. **Session persistence** — If user refreshes the page, projectId is lost (Zustand state is in-memory). Add localStorage persistence for the current project.

## Phase 4 (not started) — Modal Transcription Integration
- `backend/src/services/transcription.ts` — Needs to spawn Python subprocess to call Modal
- Status polling during transcription
- Frontend status display during transcription phase

## Phase 5 (not started) — End-to-end Testing
- Full workflow: upload → transcribe → edit → render → download
- System prompt tuning for edit quality

## Project Structure
```
cyrano-clips/
  package.json              # npm workspaces root
  tsconfig.base.json
  .gitignore
  HANDOFF.md                # this file
  shared/
    package.json
    types.ts                # Project, Clip, Timeline, Transcript, SSEEvent types
  backend/
    package.json            # express, @anthropic-ai/claude-agent-sdk, multer, etc.
    src/
      index.ts
      routes/   (projects, upload, chat, timeline, media, exports)
      services/ (storage, claude-session)
      prompts/  (system)
  frontend/
    package.json            # react, vite, zustand
    vite.config.ts          # proxy /api to localhost:3001
    index.html
    src/
      main.tsx, App.tsx, index.css
      api/client.ts
      stores/ (useProjectStore, useChatStore)
      components/ (ErrorBoundary, WelcomeScreen, EditorLayout, ChatPanel, ChatBubble, Sidebar, TranscriptDrawer)
  modal/                    # (in last-week/ — needs to be copied back when doing transcription integration)
  last-week/                # all v1 code
```

## How to Run
```bash
# Terminal 1 — Backend
cd backend && npx tsx src/index.ts

# Terminal 2 — Frontend  
cd frontend && npx vite
```

Backend on :3001, frontend on :5173 (proxies /api to backend).
