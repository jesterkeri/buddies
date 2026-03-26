# Buddies — Build Steps

## Phase 1: Project Setup (Day 1)
1. Initialize ElizaOS v2 monorepo
2. Scaffold 5 plugin packages (team-lead, code-reviewer, scout, bounty-hunter, buddy)
3. Set up TypeScript config, linting, and project structure
4. Initialize Git repo and push to GitHub (public)

## Phase 2: Agent Characters (Day 1–2)
5. Write character file for Chief (Team Lead)
6. Write character file for Hawk (Code Reviewer)
7. Write character file for Radar (Scout)
8. Write character file for Tracker (Bounty Hunter)
9. Write character file for Beans (Buddy)
10. Test all 5 agents load and respond with correct personalities

## Phase 3: Infrastructure (Day 2–3)
11. Build Docker multi-container setup (1 container per agent + frontend + backend)
12. Write Docker Compose config
13. Integrate Qwen3.5-27B inference endpoint (Nosana-provided)
14. Build API key provider system (per-agent model selection)
15. **Deploy to Nosana** — get basic agents running

## Phase 4: Inter-Agent Messaging (Day 3–4)
16. Set up ElizaOS rooms/worlds for shared chat
17. Implement agent-to-agent messaging (agents read and respond to each other)
18. Build message routing — @mentions trigger specific agents
19. Test multi-agent conversation flow end-to-end

## Phase 5: Frontend — Chat Room (Day 4–6)
20. Scaffold React + Tailwind app
21. Build chat room layout (message list, input bar, agent sidebar)
22. Add agent avatars and name badges
23. Add typing indicators per agent
24. Implement @mention autocomplete
25. Wire frontend to backend API (WebSocket or polling)
26. Display agent status (WORKING / IDLE)

## Phase 6: Onboarding Flow (Day 5–7)
27. Step 1 — Skill Profile form (languages, frameworks, chains, experience, availability)
28. Step 2 — Name Your Team (custom names + avatar selection + personality tone)
29. Step 3 — API Key Configuration (default provider + per-agent override)
30. Step 4 — Preferences (location, work hours, break style, GitHub repos, notification prefs)
31. Step 5 — Enter Chat Room (agents introduce themselves)

## Phase 7: Team Lead Logic (Day 7–9)
32. Task management — create, prioritize, track tasks
33. Daily scheduling and standup generation
34. PR description and commit message drafting
35. Email triage — inbox summary, draft replies, flag to other agents
36. Agent monitoring — track agent status, nudge stuck agents
37. Group meeting orchestration (standup, sprint planning, ad-hoc)

## Phase 8: Code Reviewer Logic (Day 8–10)
38. Code review — accept snippets/files/PRs, return severity-rated feedback
39. Smart contract security checks (reentrancy, access control, overflow, gas)
40. Commit watching — flag bad messages, oversized commits
41. Test generation — suggest and generate unit tests
42. Pre-submission audit pipeline (review → test → report)

## Phase 9: Scout Logic (Day 9–11)
43. GitHub repo monitoring (new releases, breaking changes, deprecations)
44. Dependency tracking and breaking change alerts
45. Security advisory monitoring (CVEs relevant to user's stack)
46. Research briefings — pull docs, tutorials, examples on demand
47. Documentation generation (README, API docs, changelogs)

## Phase 10: Bounty Hunter Logic (Day 10–12)
48. Platform scraping/API integration (Immunefi, Dora Hacks, Superteam, etc.)
49. Skill matching algorithm (overlap %, time commitment, pay analysis)
50. Daily morning briefing with top matched opportunities
51. Sync with Team Lead for availability checks

## Phase 11: Buddy Logic (Day 11–13)
52. Work session tracking (start time, duration, streaks)
53. Break reminders (Pomodoro, custom intervals)
54. Wellness prompts (eat, hydrate, stretch, go outside)
55. Location-based recommendations (Google Places API — food, cafes, coworking)
56. Music recommendations (playlist curation based on context)
57. Celebration messages on wins (PR merged, bounty completed, ship)

## Phase 12: Inter-Agent Triggers (Day 12–14)
58. Bounty Hunter finds opportunity → Team Lead evaluates bandwidth
59. Code Reviewer flags critical bug → Team Lead bumps to P0
60. Scout reports breaking dependency → Team Lead creates task
61. Buddy says overworking → Team Lead finds stopping point
62. User accepts opportunity → full team mobilizes (Scout pulls docs, Reviewer sets checklist, Lead blocks time)

## Phase 13: Memory & Persistence (Day 13–15)
63. Set up SQLite/PGLite for agent memory
64. Persist conversation history across sessions
65. Store user profile, preferences, and team config
66. Agent memory — each agent remembers past interactions and context

## Phase 14: UX Polish (Day 15–17)
67. Chat room styling — clean, modern, distinct from terminal chatbots
68. Agent avatar design (5 distinct characters)
69. Message threading and conversation grouping
70. Responsive design and mobile-friendly layout
71. Onboarding flow animations and transitions
72. Error states and loading states across the app

## Phase 15: Documentation (Day 16–18)
73. Write comprehensive README with quick-start guide
74. Create architecture diagram (5 agents + communication patterns)
75. Document each agent's capabilities
76. Document onboarding flow
77. Add inline code comments

## Phase 16: Demo & Submission (Day 17–19)
78. Record 60-second demo video (follow the scripted flow)
79. Write 300-word project description
80. Create social media post (Twitter thread with screenshots)
81. Star the 4 Nosana GitHub repos
82. Final end-to-end testing on Nosana deployment
83. **SUBMIT BY APRIL 14**
