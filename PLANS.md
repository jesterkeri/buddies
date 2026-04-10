# Buddies — Build Steps

**Revised scope**: Unified dashboard with Chat Room, Pixel Office, Task Board, and Activity Feed. Inspired by Mission Control (builderz-labs) and OpenClaw pixel office.

**Timeline**: March 26 → April 14 = 19 days

---

## Phase 1: Project Setup (Day 1) ~~DONE~~
- [x] 1. Initialize ElizaOS v2 monorepo
- [x] 2. Scaffold 5 plugin packages (team-lead, code-reviewer, scout, bounty-hunter, buddy)
- [x] 3. Set up TypeScript config, linting, and project structure
- [x] 4. Initialize Git repo and push to GitHub (public)

## Phase 2: Agent Characters (Day 1–2) ~~DONE~~
- [x] 5. Write character file for Chief (Team Lead)
- [x] 6. Write character file for Hawk (Code Reviewer)
- [x] 7. Write character file for Radar (Scout)
- [x] 8. Write character file for Tracker (Bounty Hunter)
- [x] 9. Write character file for Beans (Buddy)
- [x] 10. Test all 5 agents load and respond with correct personalities

## Phase 3: Infrastructure (Day 1–2) ~~DONE~~
- [x] 11. Build Docker container setup
- [x] 12. Write Docker Compose config
- [x] 13. Integrate Qwen3.5-27B inference endpoint (Nosana-provided)
- [x] 14. Build API key provider system (per-agent model selection)
- [x] 15. **Deploy to Nosana** — LIVE and RUNNING

---

## Phase 4: Inter-Agent Messaging (Day 2–3) ~~DONE~~
- [x] 16. Set up ElizaOS rooms/worlds for shared chat
- [x] 17. Implement agent-to-agent messaging (agents read and respond to each other)
- [x] 18. Build message routing — @mentions trigger specific agents
- [x] 19. Shared agent state system (WORKING / IDLE / MEETING / REVIEWING)
- [x] 20. Test multi-agent conversation flow end-to-end

## Phase 5: Dashboard Shell & Chat Room (Day 3–5) ~~DONE~~
- [x] 21. Scaffold React + Tailwind dashboard app
- [x] 22. Build tab/panel routing (Chat Room | Pixel Office | Task Board | Activity)
- [x] 23. Build chat room layout (message list, input bar, agent sidebar)
- [x] 24. Add agent avatars and name badges with status indicators
- [ ] 25. Add typing indicators per agent (placeholder — needs backend streaming)
- [x] 26. Implement @mention autocomplete
- [x] 27. Wire frontend to ElizaOS backend via Sessions API
- [x] 28. Real-time message display with WhatsApp-style left/right layout

## Phase 6: Pixel Art Office (Day 5–8) ~~DONE~~
- [x] 29. Set up PixiJS canvas for the office scene
- [x] 30. Design office tilemap (desks, meeting table, break area, Beans' couch)
- [x] 31. Create 5 agent characters (comic book style colored blocks with initials)
- [x] 32. Character state machine (idle, walking, typing, meeting, break)
- [x] 33. BFS pathfinding on tile grid
- [x] 34. Agent state → character sync (live from /api/buddies/states)
- [x] 35. Meeting animation — all agents walk to conference table
- [x] 36. Beans break area position
- [x] 37. Click-to-chat — click agent → switches to Chat Room
- [x] 38. Status labels above characters + typing dots indicator
- [ ] 39. Ambient animations (screen glow, coffee steam, clock) — deferred to polish

## Phase 7: Task Board (Day 8–9) ~~DONE~~
- [x] 40. Kanban board component (TODO | IN PROGRESS | REVIEW | DONE)
- [x] 41. Chief creates/assigns/moves tasks
- [x] 42. Tasks linked to chat messages (click task → jump to conversation)
- [x] 43. Priority tags (P0 critical / P1 high / P2 medium / P3 low)
- [x] 44. Agent avatars on task cards showing who's assigned

## Phase 8: Activity Feed (Day 9–10) ~~DONE~~
- [x] 45. Real-time activity log panel
- [x] 46. Event types: agent spoke, task created, review completed, opportunity found, break reminder
- [x] 47. Filterable by agent
- [x] 48. Clickable entries → navigate to relevant chat message or task

## Phase 9: Agent Logic — Core Actions (Day 10–13) ~~DONE~~
- [x] 49. **Chief**: Task CRUD, daily standup generation, priority reshuffling, meeting orchestration
- [x] 50. **Hawk**: Code review action (accept code → return severity-rated feedback), test generation
- [x] 51. **Radar**: Research action (accept topic → return sourced briefing), dependency alerts
- [x] 52. **Tracker**: Opportunity scan action (return matched opportunities with scores)
- [x] 53. **Beans**: Work timer tracking, break reminders, celebration messages, location recs

## Phase 10: Inter-Agent Triggers (Day 12–14) ~~DONE~~
- [x] 54. Tracker finds opportunity → Chief evaluates bandwidth → full team mobilizes
- [x] 55. Hawk flags critical bug → Chief bumps to P0 → Radar pulls CVEs
- [x] 56. Radar reports breaking dependency → Chief creates remediation task
- [x] 57. Beans detects overworking → Chief finds stopping point
- [x] 58. In pixel office: triggered agents visually walk to each other / gather at meeting table

## Phase 11: Onboarding Flow (Day 13–14) ~~DONE~~
- [x] 59. Step 1 — Skill Profile (languages, frameworks, chains, experience)
- [x] 60. Step 2 — Name Your Team (custom names + personality tone)
- [x] 61. Step 3 — API Key Configuration (default + per-agent override)
- [x] 62. Step 4 — Preferences (location, work hours, break style)
- [x] 63. Step 5 — Enter Dashboard (onboarding gates access to dashboard)

## Phase 12: Memory & Persistence (Day 14–15) ~~DONE~~
- [x] 64. SQLite/PGLite for agent memory via @elizaos/plugin-sql (built-in)
- [x] 65. Persist conversation history across sessions (ElizaOS handles this)
- [x] 66. Store user profile, preferences, and team config (localStorage)
- [x] 67. Agent memory — each agent remembers past interactions (ElizaOS built-in)

## Phase 13: UX Polish (Day 15–17) ~~DONE~~
- [x] 68. Dashboard styling — comic book theme with Permanent Marker + Space Mono
- [x] 69. Pixel office polish — real Pixel Agents sprites, warm wooden floors, break room
- [x] 70. Chat room polish — message grouping, timestamps, auto-scroll
- [x] 71. Responsive layout (desktop primary)
- [x] 72. Loading states, error states, empty states across all panels
- [ ] 73. Sound effects for pixel office (deferred — optional)

---

## Phase 14: Frontend-Backend Rewire & AI Config (Day 17–18) ~~DONE~~
- [x] 74. Rewire chat to use ElizaOS Sessions API with HTTP transport
- [x] 75. Per-agent AI provider config from frontend Connect tab
- [x] 76. Config server (port 3001) for backend AI config persistence
- [x] 77. WhatsApp-style message layout (user right, agent left)
- [x] 78. Reply-to-message feature
- [x] 79. Agent disconnect/connect from frontend sidebar
- [x] 80. Remove all placeholder/fake data from Intel and Missions tabs
- [x] 81. Ensure config syncs properly on deploy (no localhost hardcoding)

## Phase 15: RAG Pipelines for Agents (Day 18–19) ~~DONE~~
- [x] 82. **Hawk RAG**: Code context provider fetches files from connected GitHub repo for review
- [x] 83. **Radar RAG**: Web research provider via Jina Reader (any URL → markdown) + npm registry for dependency checks
- [x] 84. **Bounty Hunter RAG**: 10+ sources — Devpost, Devfolio, Superteam Earn, GitHub Issues (direct API) + Immunefi, Akindo, ETHGlobal, DoraHacks, Layer3, OnlyDust (via Jina Reader)
- [x] 85. **Chief RAG**: Project context provider (task board + chat history) + shared repo context
- [x] 86. **Buddy RAG**: OpenStreetMap places service — restaurants, hotels, cafes via Nominatim geocoding + Overpass API (free, no key)
- [x] 87. Shared utilities: `web-fetch.ts` (Jina Reader wrapper), `bounty-service.ts`, `places-service.ts`

## Phase 16: Agent Feature Buildout (Day 18–19) ~~DONE~~
- [x] 88. **Hawk**: Accept GitHub PR URL → fetch diff → review with severity tags + inline suggestions
- [x] 89. **Hawk**: Security audit mode — OWASP Top 10 action with severity ratings
- [x] 90. **Radar**: Monitor npm dependencies for breaking changes and CVEs
- [x] 91. **Radar**: Breaking change detection with changelog fetching via Jina Reader
- [x] 92. **Bounty Hunter**: Skill matching via listing tags (provider-level context)
- [x] 93. **Bounty Hunter**: Auto-draft application templates (DRAFT_APPLICATION action)
- [x] 94. **Chief**: Generate PR descriptions from git diff (DRAFT_PR action)
- [x] 95. **Chief**: Daily standup summary from all agent activity (GENERATE_STANDUP action)
- [x] 96. **Buddy**: Location-aware food/cafe/hotel recommendations via OpenStreetMap
- [x] 97. **Buddy**: Pomodoro timer (START_POMODORO action, 25min work / 5min break)
- [x] 98. All agents: Autonomous loops infrastructure built

## Phase 16B: Autonomous Agent Communication (Day 19) ~~DONE~~
- [x] 98a. Autonomous loops retry until 2+ agents are connected (no team channel dependency)
- [x] 98b. Chief standup — sends to each connected agent via sessions API, collects real responses
- [x] 98c. Agent-to-agent via sessions API — HTTP transport, guaranteed responses, no team channel
- [x] 98d. Bounty Hunter periodic scans → sends findings to Chief via session → Chief responds
- [x] 98e. Buddy wellness checks → sends to Chief via session → Chief acknowledges
- [x] 98f. Radar dependency monitoring → sends to Chief + Hawk via sessions → both respond
- [x] 98g. Trigger chains → fireTrigger sends to each target agent individually via sessions
- [x] 98h. Autonomous messages persisted to .buddies-autonomous-messages.json
- [x] 98i. Rate limiting — AGENT_COOLDOWN_MS (60s), skip disconnected agents, skip busy agents
- [x] 98j. Frontend polls /autonomous-messages endpoint, displays agent-to-agent exchanges in chat

## Phase 16C: Streaming + War Room Stabilization (Day 19) ~~DONE~~
- [x] 98k. Fix HTTP 500 ZodError on Google/Groq replies — patch fetch to redirect /responses → /chat/completions, transform request body, live-rewrite chat.completion.chunk SSE into Responses API events
- [x] 98l. Drain trailing un-terminated SSE events in TransformStream flush so streams that close mid-event still emit deltas
- [x] 98m. Per-agent secrets via character.secrets Proxy (src/shared/ai-config.ts) — survives ElizaOS mergeAgentSettings spread by NOT seeding global OPENAI_API_KEY into process.env
- [x] 98n. WarRoomTimeline panel on COMMS tab — right sidebar shows agent-to-agent exchanges from /autonomous-messages
- [x] 98o. War room session filter via useSession.startTime, msg.response paired rendering, useMemo on filtered array, replay snapshot so live updates don't make replay chase its tail
- [x] 98p. Card entrance animation via plain @keyframes warroom-card-in in globals.css (no tailwindcss-animate dependency)
- [x] 98q. Coalesced /autonomous-messages polling via shared queryClient.fetchQuery cache key — war room and chat feed share one network call most of the time

## Phase 16D: Demo Readiness Cleanup (Day 19)
- [ ] 98r. **Buddy provider swap** — Groq llama-3.3-70b key is rate-limited every few requests. Replace with new key (user has one incoming) or switch provider in .buddies-ai-config.json
- [ ] 98s. **Radar provider decision** — currently on local ollama gemma4, works in real frontend context but fragile to thin/empty contexts (returns "[STOP]" on synthetic curl tests). Either keep gemma4 or swap to a fresh Gemini key for reliability
- [ ] 98t. **Sidebar status drift fix** — settingsStore.loadAiConfigFromBackend() runs once at module init with no polling, so ACTIVE_SQUAD badges show stale state after a config edit until page refresh. Wire to sessionStore notify or poll the config server
- [ ] 98u. **Frontend bundle sync into ElizaOS server dir** — node_modules/@elizaos/server/dist/client/ is baked at Docker build time and doesn't reflect frontend/dist/. Either add a postbuild script that mirrors frontend/dist/* into the ElizaOS client dir, or fix Dockerfile to do it on container build. Required for Nosana submission, not for local demo (vite at 5173 works for live demo)
- [ ] 98v. **WebSocket transport bus subscriber bug (post-demo)** — node_modules/@elizaos/server/dist/index.js:28600 defaults bus messages to ChannelType.GROUP, causing shouldRespond LLM eval to fail on plain-text replies. Frontend uses transport: 'http' so this doesn't block the demo, but it's still wrong if anything hits the default transport
- [ ] 98w. **War room polish backlog (post-demo)** — auto-scroll dep narrowing (currently fires on parent re-renders), tab-aware mount so the war room only renders when COMMS is active, snapshot empty-array edge case on REPLAY click

## Phase 16E: Dashboard Tab Audit & Wiring (Day 19)
Verify each non-COMMS tab is wired to live data and behaves correctly. Tab IDs in TopNav.tsx: chat → COMMS, office → HQ, tasks → MISSIONS, activity → INTEL, session → GIT SESSION, connect → CONNECT.

### HQ (office / PixelOffice.tsx)
- [ ] 98x. Verify agent characters sync to live state from /api/buddies/states (WORKING / IDLE / MEETING / REVIEWING) — no stale or stub data
- [ ] 98y. Verify meeting animation triggers when Chief calls standup — all 5 agents walk to conference table on the GENERATE_STANDUP action
- [ ] 98z. Verify Buddy walks to break area on Pomodoro break events
- [ ] 98aa. Click-to-chat: clicking an agent in the office switches activeTab to 'chat' AND focuses that agent in the message input (currently only switches tab)
- [ ] 98ab. Status labels above characters update with current agent state, typing dots show when agent is generating
- [ ] 98ac. Verify character positions don't drift off the tilemap on long sessions (BFS pathfinding bounds)

### MISSIONS (tasks / TaskBoard.tsx)
- [ ] 98ad. Verify Chief's CREATE_TASK / MOVE_TASK / ASSIGN_TASK / DELETE_TASK actions persist to taskStore — currently localStorage-backed, decide if backend persistence is needed
- [ ] 98ae. Drag-drop between columns (TODO / IN PROGRESS / REVIEW / DONE) works and persists
- [ ] 98af. Priority sorting (P0/P1/P2/P3) applied within each column (already in TaskBoard.tsx:14-18, verify)
- [ ] 98ag. Click task → jump to the chat message that created it (Phase 7 task #42, verify still wired after recent hooks.ts changes)
- [ ] 98ah. + NEW button creates a task with current user as creator and routes it through Chief
- [ ] 98ai. Verify autonomous trigger chains create tasks (e.g., Hawk flags critical bug → Chief auto-creates P0 task)

### INTEL (activity / ActivityFeed.tsx)
- [ ] 98aj. Verify activity events fire from real system events: message sent, task created, review completed, opportunity found, break triggered — no stub feed
- [ ] 98ak. Per-agent filter actually filters the live event stream and persists during the session
- [ ] 98al. Click an event → jump to the source (chat message, task card, etc.)
- [ ] 98am. Auto-scroll new events into view, clear filter button works
- [ ] 98an. Pull from /autonomous-messages too, not just locally pushed events — agents talking to each other should show up in INTEL

### GIT SESSION (session / SessionPage.tsx — sessionProjectStore)
- [ ] 98ao. PAT input + Connect Repo flow actually hits the GitHub API and pulls metadata, branches, file tree, issues, PRs, README
- [ ] 98ap. File tree fetches lazily on directory expand via fetchDirectory()
- [ ] 98aq. Branch switching updates Hawk's code-context provider so reviews target the active branch
- [ ] 98ar. Issues + PRs lists pull live from the connected repo
- [ ] 98as. Per-agent READ/WRITE access toggles persist (currently component state only per comment in SessionPage.tsx:15-16)
- [ ] 98at. Hawk can read repo files via the connected session — verify by asking Hawk to review a file from the connected repo
- [ ] 98au. Verify token is stored securely (not in localStorage plaintext for the Nosana submission)

### CONNECT (connect / SettingsPage.tsx)
- [ ] 98av. Per-agent provider/key/model edits persist to .buddies-ai-config.json via the config server (port 3001)
- [ ] 98aw. Saving a new key triggers an immediate sidebar refresh OR shows a banner saying "refresh to apply" — currently the sidebar is stuck on cached module-init state
- [ ] 98ax. Validate the provider key in-form (call provider's models endpoint or echo a test message) before saving
- [ ] 98ay. NOT CONNECTED state shows the actual reason: missing key vs bad provider vs disconnect=true
- [ ] 98az. Default provider edit cascades to agents that don't have a per-agent override

## Phase 17: Nosana Deployment (Day 19)
- [ ] 99. Build Docker image with all changes
- [ ] 100. Push to Docker Hub (jesterkeri/buddies)
- [ ] 101. Deploy to Nosana GPU network
- [ ] 102. Test all agents respond on Nosana with Qwen3.5-27B or user-connected provider
- [ ] 103. Verify frontend loads, chat works, config persists inside container
- [ ] 104. Test onboarding flow end-to-end on deployed instance

## Phase 18: Demo & Submission (Day 19)
- [ ] 105. Record 60-second demo video:
  - 0–10s: Intro — show the dashboard with pixel office
  - 10–20s: Onboarding — connect API key, name your team
  - 20–35s: Chat room — @mention agents, they respond with personality
  - 35–45s: Pixel office — watch agents walk to meeting table, collaborate visually
  - 45–55s: Tracker drops a bounty briefing, team mobilizes
  - 55–60s: Beans reminds user to eat, close with tagline
- [ ] 106. Write 300-word project description
- [ ] 107. Create social media post (Twitter thread with screenshots + pixel office GIF)
- [ ] 108. Star the 4 Nosana GitHub repos
- [ ] 109. Final end-to-end testing on Nosana deployment
- [ ] 110. Rebuild and push Docker image with full frontend
- [ ] 111. **SUBMIT BY APRIL 14**
