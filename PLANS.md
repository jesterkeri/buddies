# Buddies — Build Steps

**Revised scope**: Unified dashboard with Chat Room, Pixel Office, Task Board, and Activity Feed. Inspired by Mission Control (builderz-labs) and OpenClaw pixel office.

**Timeline**: March 26 → April 14 = 19 days (Day 1 complete)

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

## Phase 5: Dashboard Shell & Chat Room (Day 3–5)
- [ ] 21. Scaffold React + Tailwind dashboard app
- [ ] 22. Build tab/panel routing (Chat Room | Pixel Office | Task Board | Activity)
- [ ] 23. Build chat room layout (message list, input bar, agent sidebar)
- [ ] 24. Add agent avatars and name badges with status indicators
- [ ] 25. Add typing indicators per agent
- [ ] 26. Implement @mention autocomplete
- [ ] 27. Wire frontend to ElizaOS backend via WebSocket
- [ ] 28. Real-time message streaming from all 5 agents

## Phase 6: Pixel Art Office (Day 5–8)
- [ ] 29. Set up PixiJS canvas for the office scene
- [ ] 30. Design office tilemap (desks, meeting table, break area, Beans' couch)
- [ ] 31. Create 5 pixel art character sprites (Chief, Hawk, Radar, Tracker, Beans)
- [ ] 32. Character state machine (idle, walking, typing, reading, meeting, break)
- [ ] 33. BFS pathfinding on tile grid
- [ ] 34. Agent state → sprite sync (Hawk reviewing code = sitting at desk typing)
- [ ] 35. Meeting animation — all agents walk to conference table when Chief calls meeting
- [ ] 36. Beans break area — Beans walks to couch/kitchen when reminding user to rest
- [ ] 37. Click-to-chat — click an agent sprite to open DM in chat room
- [ ] 38. Status bubbles above sprites (speech bubble preview of latest message)
- [ ] 39. Ambient animations (screen glow, coffee steam, clock)

## Phase 7: Task Board (Day 8–9)
- [ ] 40. Kanban board component (TODO | IN PROGRESS | REVIEW | DONE)
- [ ] 41. Chief creates/assigns/moves tasks
- [ ] 42. Tasks linked to chat messages (click task → jump to conversation)
- [ ] 43. Priority tags (P0 critical / P1 high / P2 medium / P3 low)
- [ ] 44. Agent avatars on task cards showing who's assigned

## Phase 8: Activity Feed (Day 9–10)
- [ ] 45. Real-time activity log panel
- [ ] 46. Event types: agent spoke, task created, review completed, opportunity found, break reminder
- [ ] 47. Filterable by agent
- [ ] 48. Clickable entries → navigate to relevant chat message or task

## Phase 9: Agent Logic — Core Actions (Day 10–13)
- [ ] 49. **Chief**: Task CRUD, daily standup generation, priority reshuffling, meeting orchestration
- [ ] 50. **Hawk**: Code review action (accept code → return severity-rated feedback), test generation
- [ ] 51. **Radar**: Research action (accept topic → return sourced briefing), dependency alerts
- [ ] 52. **Tracker**: Opportunity scan action (return matched opportunities with scores)
- [ ] 53. **Beans**: Work timer tracking, break reminders, celebration messages, location recs

## Phase 10: Inter-Agent Triggers (Day 12–14)
- [ ] 54. Tracker finds opportunity → Chief evaluates bandwidth → full team mobilizes
- [ ] 55. Hawk flags critical bug → Chief bumps to P0 → Radar pulls CVEs
- [ ] 56. Radar reports breaking dependency → Chief creates remediation task
- [ ] 57. Beans detects overworking → Chief finds stopping point
- [ ] 58. In pixel office: triggered agents visually walk to each other / gather at meeting table

## Phase 11: Onboarding Flow (Day 13–14)
- [ ] 59. Step 1 — Skill Profile (languages, frameworks, chains, experience)
- [ ] 60. Step 2 — Name Your Team (custom names + personality tone)
- [ ] 61. Step 3 — API Key Configuration (default + per-agent override)
- [ ] 62. Step 4 — Preferences (location, work hours, break style)
- [ ] 63. Step 5 — Enter Dashboard (agents introduce themselves in chat + walk to desks in office)

## Phase 12: Memory & Persistence (Day 14–15)
- [ ] 64. SQLite/PGLite for agent memory via @elizaos/plugin-sql
- [ ] 65. Persist conversation history across sessions
- [ ] 66. Store user profile, preferences, and team config
- [ ] 67. Agent memory — each agent remembers past interactions

## Phase 13: UX Polish (Day 15–17)
- [ ] 68. Dashboard styling — dark theme, clean panels, smooth transitions
- [ ] 69. Pixel office polish — furniture details, lighting effects, day/night cycle
- [ ] 70. Chat room polish — message grouping, timestamps, scroll behavior
- [ ] 71. Responsive layout (desktop primary, tablet secondary)
- [ ] 72. Loading states, error states, empty states across all panels
- [ ] 73. Sound effects for pixel office (optional — typing clicks, meeting chime)

## Phase 14: Documentation (Day 16–18)
- [x] 74. Write comprehensive README with quick-start guide
- [ ] 75. Create architecture diagram (dashboard + agents + communication flow)
- [ ] 76. Document each agent's capabilities and personality
- [ ] 77. Document onboarding flow
- [ ] 78. Screenshots of all dashboard views for README

## Phase 15: Demo & Submission (Day 17–19)
- [ ] 79. Record 60-second demo video:
  - 0–10s: Intro — show the dashboard with pixel office
  - 10–20s: Onboarding — name your team, connect API keys
  - 20–35s: Chat room — paste code, Hawk reviews, Radar pulls CVE, Chief reprioritizes
  - 35–45s: Pixel office — watch agents walk to meeting table, collaborate visually
  - 45–55s: Tracker drops a bounty briefing, team mobilizes
  - 55–60s: Beans reminds user to eat, close with tagline
- [ ] 80. Write 300-word project description
- [ ] 81. Create social media post (Twitter thread with screenshots + pixel office GIF)
- [ ] 82. Star the 4 Nosana GitHub repos
- [ ] 83. Final end-to-end testing on Nosana deployment
- [ ] 84. Rebuild and push Docker image with full frontend
- [ ] 85. **SUBMIT BY APRIL 14**
