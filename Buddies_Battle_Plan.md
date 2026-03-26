# BUDDIES
### *Your AI Dev Team. Always Got Your Back.*

---

## Nosana Builders: ElizaOS Challenge — Battle Plan

A multi-agent productivity platform for developers, built on ElizaOS v2 and deployed on Nosana. Five specialized AI agents share a chat room, talk to each other, collaborate on your behalf, and keep your entire dev life running — from code quality to finding your next gig to reminding you to eat.

| | |
|---|---|
| **Competition** | Nosana Builders: ElizaOS Challenge |
| **Prize Pool** | $3,000 USDC |
| **Deadline** | April 14, 2026 |
| **Framework** | ElizaOS v2 |
| **Deployment** | Nosana Decentralized GPU Network |
| **Builder** | Joshua — Full Stack, Smart Contract, AI Engineer & Product Designer |

---

## Interaction Modes

### Mode 1: Chat Room (Primary MVP)

Slack-style interface where you @mention agents, they respond, reference each other, debate, and surface action items. Agents have distinct avatars, personalities, and typing indicators. This is the core experience for the competition.

### Mode 2: Virtual Office (Future Roadmap)

Gather.town-style spatial view where agents are pixel-art characters with statuses (WORKING / IDLE). Walk up to interact or call a team meeting where they all convene. Stretch goal for post-competition.

---

## Onboarding Flow

- **Step 1: Skill Profile** — Languages, frameworks, chains, experience level, past projects, availability, portfolio links.

- **Step 2: Name Your Team** — Each agent gets a custom name and optional avatar. Defaults: Chief, Hawk, Radar, Tracker, Beans. Personality tone: professional / casual / sarcastic.

- **Step 3: Connect API Keys** — Users connect API keys for each agent's LLM provider. Each agent can run on a different model. For example, Code Reviewer on Claude for deep reasoning, Scout on GPT-4o for speed, Buddy on a lighter model to save costs. Supported providers: OpenAI, Anthropic, Google Gemini, Llama (via Nosana), Grok, Mistral, and the competition-provided Qwen3.5-27B endpoint. Users can also set a default provider for all agents and override per-agent.

- **Step 4: Preferences** — Location (for Buddy), work hour limits, break preferences, minimum bounty/pay thresholds, GitHub repos to watch, platforms to scan, notification preferences.

- **Step 5: Enter the Chat Room** — All 5 agents introduce themselves by name. Team Lead asks what you're working on. Bounty Hunter shares today's top matches. Buddy sets the vibe.

---

## Group Meetings

Users can call a group meeting where all 5 agents convene to discuss a topic. Team Lead facilitates, each agent contributes from their domain, and the meeting ends with action items. Meetings can also be triggered automatically by Team Lead when cross-agent coordination is needed.

**Meeting Types:**

- **Daily Standup** — Auto-triggered each morning. Each agent gives a quick status. Team Lead summarizes priorities for the day.
- **Sprint Planning** — When starting a new project or hackathon. Bounty Hunter presents the brief, Scout shares research, Code Reviewer sets quality bar, Team Lead builds the task plan, Buddy checks it's sustainable.
- **Incident Response** — Auto-triggered when Code Reviewer finds a critical vulnerability or Scout reports a breaking change. All agents mobilize.
- **Retrospective** — After completing a project or hackathon. What went well, what didn't, what to improve. Team Lead documents takeaways.
- **Ad-Hoc** — User calls a meeting anytime: "Hey team, let's discuss the staking contract architecture." All agents join and contribute.

**Example — Daily Standup:**

```
Team Lead: "Morning standup. Let's go around."

Hawk: "Finished the deep review on withdraw(). 2 issues fixed, 1 pending your approval."

Radar: "Nosana SDK v2.1 dropped overnight. No breaking changes, but there's a new endpoint we should use."

Tracker: "3 new bounties matched your profile. Top one is a $5K audit, 92% skill match."

Beans: "You worked 9 hours yesterday. I'm enforcing a hard stop at 6pm today. Non-negotiable."

Team Lead: "Thanks team. Today's priorities: 1) Merge the withdraw fix, 2) Explore the new Nosana endpoint, 3) Review the $5K audit bounty. Let's ship."
```

---

## Agent Characters & Personalities

Each agent has a distinct personality defined in their ElizaOS character file. This isn't just flavor — it affects how they communicate with you and with each other, making conversations feel natural and each agent recognizable. Users can customize the personality tone during onboarding (professional / casual / sarcastic).

| Agent | Personality | Communication Style |
|---|---|---|
| **Team Lead** (Chief) | Calm, decisive, big-picture thinker. The glue that holds the team together. | Concise and structured. Speaks in priorities and action items. Never panics. |
| **Code Reviewer** (Hawk) | Sharp, detail-obsessed, brutally honest. The perfectionist who catches what everyone else misses. | Direct, technical, doesn't sugarcoat. Uses severity tags. Respects clean code, roasts sloppy code. |
| **Scout** (Radar) | Curious, resourceful, always one step ahead. The one who knows things before anyone else. | Informative, links sources, provides context. Speaks like a well-connected insider. |
| **Bounty Hunter** (Tracker) | Hustler energy, opportunistic, numbers-driven. Always looking for the next win. | Pitches opportunities with enthusiasm. Leads with match % and money. Competitive but strategic. |
| **Buddy** (Beans) | Warm, funny, emotionally intelligent. The team's heart and soul. Part intern, part therapist. | Casual, uses humor, celebrates wins, checks in on you. The only agent that uses emojis. |

**How Personalities Shape Agent-to-Agent Conversations:**

```
Hawk: "Your withdraw function has a reentrancy vulnerability. This is embarrassing."

Beans: "Easy there, Hawk. Everyone makes mistakes. At least we caught it before mainnet."

Radar: "I found a similar exploit from last month. Here's the post-mortem and the fix."

Tracker: "Good timing — there's actually a $5K bounty for auditing a lending protocol with the same pattern. Want to turn this into an opportunity?"

Chief: "Alright team. Priority 1: fix the vulnerability. Priority 2: Tracker, queue that bounty for review after the fix ships. Hawk, do a full deep scan while we're at it."
```

---

## The Agent Team

Five specialized agents, each with distinct responsibilities. No overlap. Each one feeds the others.

---

### Agent 1: Team Lead (Comms + Email + Agent Monitor)

*Default name: Chief | Role: The team coordinator*

**Core Responsibilities:**
- Manages tasks, priorities, deadlines, and daily schedule
- Coordinates all other agents — decides urgency, reshuffles when needed
- Mediates conflicts (Bounty Hunter wants a new hackathon but Code Reviewer says current codebase has critical issues)

**Communication & Email:**
- Drafts standup summaries from completed tasks
- Writes PR descriptions, commit messages, and changelogs
- Generates weekly recaps and status reports
- Composes team updates for stakeholders
- Triages inbox — flags important emails, summarizes unread threads
- Drafts and sends email replies based on context (knows your tasks and schedule)
- Flags relevant emails to other agents (security alert → Code Reviewer, bounty opportunity → Bounty Hunter)

**Agent Monitoring:**
- Tracks what each agent is doing, how long tasks are taking, and whether agents are stuck or idle
- Follows up if an agent hasn't delivered (Scout's research brief is 30 min late → nudge)
- Surfaces agent status dashboard: who's WORKING, who's IDLE, what's queued
- Detects and handles model timeouts or failures — retries or escalates to user
- Calls group meetings when cross-agent coordination is needed

**Inter-Agent Behavior:**
- Bounty Hunter finds opportunity → Team Lead evaluates bandwidth and reshuffles tasks
- Code Reviewer flags critical bug → Team Lead bumps to P0 and notifies user
- Scout reports breaking dependency → Team Lead creates remediation task
- Buddy says user overworking → Team Lead finds natural stopping point

**Example:**

```
User: "what should I focus on today?"
Team Lead: "3 tasks today: 1) Fix the reentrancy bug Code Reviewer flagged (P0),
2) Finish staking contract tests (P1), 3) Review SDK docs Scout pulled for the Nosana bounty.
I've blocked 2 hours for the bug fix this morning."
```

---

### Agent 2: Code Reviewer (Quality + Testing)

*Default name: Hawk | Role: The senior engineer*

**Code Review:**
- Reviews code snippets, files, commits, PRs, and merge requests
- Watches commit history — flags bad messages, oversized commits, mixed concerns
- Pre-commit review: catches issues before they make it into a PR
- Severity ratings: CRITICAL / HIGH / MEDIUM / LOW with specific fix suggestions
- Quick scan mode (surface-level) vs deep review mode (line-by-line)

**Smart Contract Security:**
- Reentrancy vulnerability detection
- Access control issues (missing onlyOwner, unprotected functions)
- Integer overflow/underflow, front-running susceptibility
- Storage collision detection, gas optimization suggestions

**Testing:**
- Generates unit tests, suggests edge cases, tracks test coverage
- Runs test suites and reports results to the room
- Pre-submission audit pipeline: review → test → report

**Example:**

```
Code Reviewer: "Commit a3f9b2c - 3 issues. Mixing bug fix and feature in one commit.
withdraw() swallows exceptions silently. Commit message says 'fixed stuff.'
Want me to suggest a split and rewrite the message?"

Scout: "The reentrancy pattern matches a known exploit. OpenZeppelin ReentrancyGuard v5.2
patches this."

Team Lead: "Bumping security fix to P0. Pushing frontend task to tomorrow."
```

---

### Agent 3: Scout (Research + Docs)

*Default name: Radar | Role: The researcher*

**Monitoring & Research:**
- Watches GitHub repos — new releases, breaking changes, deprecations
- Tracks dependency updates and flags breaking changes in your stack
- Monitors security advisories (CVEs, exploit reports) relevant to your tech
- Pulls docs, tutorials, and examples for unfamiliar tech
- Surfaces relevant threads, blog posts, and discussions for current problems

**Documentation Generation:**
- Auto-generates and updates READMEs from your codebase
- Creates API docs from code and comments
- Writes changelogs from commit history and PR descriptions
- Produces architecture docs and system diagrams

**Example:**

```
Scout: "Heads up - Solana web3.js v2.0 just shipped. 14 breaking changes from v1.x.
Your project uses 3 of the affected APIs. Here's the migration guide."

Code Reviewer: "I'll scan the affected files and flag the specific lines."

Team Lead: "Created task: Migrate to web3.js v2.0 - estimated 4 hours."
```

---

### Agent 4: Bounty Hunter (Opportunity Finder)

*Default name: Tracker | Role: The business development agent*

**Opportunity Scanning:**

| Category | Platforms |
|---|---|
| **Hackathons** | Superteam, Dora Hacks, Akindo, ETHGlobal, Devfolio, Encode Club |
| **Bug Bounties** | Immunefi, Code4rena, HackerOne, Sherlock, Cantina |
| **Freelance** | Upwork, Toptal, Braintrust, crypto-native boards |
| **Jobs** | Crypto Jobs List, Remote3, Wellfound, LinkedIn Web3 |
| **Grants** | Solana Foundation, Ethereum Foundation, Gitcoin, Optimism RPGF |

**Matching & Scoring:**
- Skill overlap percentage against requirements
- Time commitment vs current availability (syncs with Team Lead)
- Prize pool / pay rate analysis and competition level estimate
- Daily morning briefing with top matched opportunities

**Example:**

```
Bounty Hunter: "3 new opportunities today:
1. Nosana ElizaOS Challenge - $3K pool, 20 days, 95% skill match. Recommended.
2. Immunefi audit bounty - DeFi lending, $5K, 90% match, 8 days left.
3. Contract role - Solana DeFi, $150/hr, 3 months, 80% match."

User: "Let's do the Nosana one"

Team Lead: "Blocked 3 hours daily. Moving portfolio redesign to next month."
Scout: "Pulling ElizaOS v2 docs and Nosana deployment guides."
Code Reviewer: "Setting up review checklist based on judging criteria."
```

---

### Agent 5: Buddy (The Intern / Morale Officer)

*Default name: Beans | Role: The team's soul*

**Wellness & Work-Life Balance:**
- Tracks work sessions — knows when you started and how long you've been going
- Prompts breaks (Pomodoro, 90-min deep work blocks, or custom preferences)
- Reminds you to eat, hydrate, stretch, go outside
- Flags overworking: "You've coded 6 hours straight. Even your git history looks tired."
- Celebrates wins — ships, PR merges, bounty completions

**Location-Based Services:**
- Finds food spots, cafes, restaurants near your location
- Recommends coworking spaces and quiet work spots
- Discovers recreation — parks, gyms, events, entertainment
- Finds hotels and accommodations when traveling for hackathons

**Music & Vibes:**
- Recommends songs based on your Spotify, Apple Music, or YouTube Music listening history
- Curates focus playlists for deep work sessions, lo-fi for coding, high energy for crunch time
- Syncs with your mood and work context — chill beats during review, hype tracks before a deadline

**Morale & Team Vibe:**
- Keeps the chat room fun — humor, encouragement, hype
- De-escalates when Code Reviewer is harsh
- Handles miscellaneous requests — timers, calculations, weather, travel logistics

**Example:**

```
Buddy: "Hey, you've been at it for 4 hours straight. There's a solid ramen spot
5 minutes from you - 4.7 stars, open till 10pm. Go eat!"

Team Lead: "Good timing. You're at a natural stopping point - the staking tests are
passing and the next task is a fresh feature. Pick it up after lunch."
```

---

## API Key Configuration

Each agent can run on a different LLM provider, giving users full control over cost, speed, and reasoning quality. Users connect API keys during onboarding and can update them anytime from settings.

**Supported Providers:**
- OpenAI (GPT-4o, GPT-4-turbo, o1, o3)
- Anthropic (Claude Opus, Sonnet, Haiku)
- Google (Gemini 2.5 Pro, Flash)
- Llama (via Nosana decentralized inference)
- Qwen3.5-27B-AWQ (competition-provided endpoint)
- Grok, Mistral, DeepSeek, and more via ElizaOS model providers

**Recommended Configuration:**

| Agent | Recommended Model | Why |
|---|---|---|
| Team Lead | Claude Sonnet / GPT-4o | Fast, good at planning, email triage, and agent coordination |
| Code Reviewer | Claude Opus / o3 | Deep reasoning needed for security audits and bug detection |
| Scout | GPT-4o / Gemini Flash | Speed matters for monitoring and research tasks |
| Bounty Hunter | Claude Sonnet / GPT-4o | Good at matching, scoring, and summarizing opportunities |
| Buddy | Haiku / Gemini Flash / Qwen | Lightweight tasks, saves cost; personality over power |

**How It Works:**
- Users set a **default provider** for all agents during onboarding
- Each agent can be **overridden individually** with a different API key and model
- For the competition, the **Qwen3.5-27B endpoint** (provided by Nosana) is the default — no API key needed
- API keys are stored securely and never shared between agents or exposed in the chat
- Users can switch models on the fly from the settings panel without restarting agents

---

## Judging Criteria Strategy

### Technical Implementation (25%)

Multi-agent orchestration using ElizaOS v2 rooms/worlds. 5 custom plugins with clean action/provider/evaluator patterns. Inter-agent messaging via built-in signaling. Character files defining each agent's personality and expertise. Memory persistence across sessions. Per-agent API key configuration with model-agnostic provider system.

### Nosana Integration (25%)

All 5 agents running on Nosana's decentralized GPU network. Docker multi-container setup. Qwen3.5-27B inference powering each agent's reasoning (genuine GPU need). Health checks, graceful restarts, and deployment stability. Deploy in Week 1 and iterate.

### Usefulness & UX (25%) — YOUR EDGE

Product designer building the UX — this destroys the competition. Polished chat room with agent avatars, typing indicators, @mentions. Thoughtful onboarding (skill profiling, team naming, API config). Agent personalities that feel distinct. Actionable outputs, not information dumps.

### Creativity & Originality (15%)

Multi-agent team that talks to each other — nobody else is building this. Named, personalized agents. Buddy concept (wellness + morale) is completely unique. Bounty Hunter matching to your skillset. Per-agent model selection. Chat room as primary UX.

### Documentation (10%)

Architecture diagram showing all 5 agents and communication patterns. README with quick-start guide. Individual agent docs. Onboarding flow documentation. Inline code comments.

---

## Tech Stack

| Component | Technology | Purpose |
|---|---|---|
| **Framework** | ElizaOS v2 | Multi-agent orchestration (required) |
| **Language** | TypeScript | Primary language |
| **LLM Inference** | Qwen3.5-27B-AWQ + user API keys | Agent reasoning (Nosana endpoint + custom) |
| **Deployment** | Docker + Compose | Multi-container on Nosana |
| **Frontend** | React + Tailwind CSS | Chat room interface |
| **Backend** | Express.js | API layer |
| **Database** | SQLite / PGLite | Agent memory persistence |
| **Integrations** | GitHub API | Commit/PR monitoring, repo watching |
| **Email** | Gmail / IMAP API | Inbox triage, drafting, sending via Team Lead |
| **Location** | Google Places API | Food, leisure, coworking recs |
| **Opportunities** | Web scraping + APIs | Bounty/job platform monitoring |

---

## Timeline (March 26 → April 14 = 19 days)

### Week 1: Foundation & Infrastructure (March 26 – April 1)

- [ ] Set up ElizaOS v2 monorepo with 5 plugin scaffolds
- [ ] Define character files for all 5 agents (names, personalities, action patterns)
- [ ] Build Docker multi-container setup
- [ ] Deploy to Nosana — get basic agents running EARLY
- [ ] Integrate Qwen3.5-27B inference endpoint + API key provider system
- [ ] Build the chat room frontend shell (React + Tailwind)
- [ ] Implement inter-agent messaging via ElizaOS rooms
- [ ] Build onboarding flow (skill profile + name your team + API keys + preferences)

### Week 2: Core Agent Logic (April 2 – April 8)

- [ ] Team Lead: Task management, daily scheduling, standup generation, PR descriptions, email triage, agent monitoring
- [ ] Code Reviewer: Code review, commit watching, severity ratings, test generation
- [ ] Scout: GitHub monitoring, dependency tracking, doc generation, research briefings
- [ ] Bounty Hunter: Platform scraping/APIs, skill matching algorithm, daily briefings
- [ ] Buddy: Work time tracking, break reminders, location recs, morale messages
- [ ] Wire up inter-agent triggers (accept opportunity → full team mobilizes)
- [ ] Test multi-agent conversations end-to-end

### Week 3: Polish & Ship (April 9 – April 14)

- [ ] UX polish — chat styling, agent avatars, typing indicators, @mentions, threading
- [ ] Onboarding flow polish — smooth, intuitive, delightful
- [ ] Edge cases and error handling across all agents
- [ ] Write comprehensive README + architecture diagram
- [ ] Record 1-minute demo video (scripted: onboarding → team intro → multi-agent collab → Buddy moment)
- [ ] Write 300-word project description
- [ ] Create social media post (Twitter thread with screenshots)
- [ ] Star the 4 Nosana GitHub repos
- [ ] Final end-to-end testing on Nosana deployment
- [ ] **SUBMIT BY APRIL 14**

---

## Demo Video Script (60 seconds)

**0–10s: Intro**
"Meet Buddies — your personal AI dev team." Show the chat room with 5 named agents.

**10–25s: Onboarding**
User profiles skills, names their agents, connects API keys. Show the team introducing themselves.

**25–40s: Multi-Agent Collaboration**
User pastes a Solidity contract. Code Reviewer finds critical vulnerability. Scout pulls CVE. Team Lead reprioritizes. Agents talking to each other in real-time.

**40–50s: Bounty Hunter**
Daily briefing drops. User accepts a hackathon. Whole team mobilizes — Team Lead blocks time, Scout pulls docs, Code Reviewer sets up audit checklist.

**50–60s: Buddy + Close**
Buddy reminds user to take a break, recommends nearby cafe. Close with: "Buddies. Your team. Your names. Your workflow. Built on ElizaOS, powered by Nosana."

---

## Submission Checklist

- [ ] Public GitHub repo with clean, documented code
- [ ] Live Nosana deployment URL (all 5 agents running and stable)
- [ ] Project description (max 300 words)
- [ ] Demo video (under 1 minute)
- [ ] Social media post about the project
- [ ] Stars on 4 Nosana GitHub repos

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| 5 agents too ambitious | Prioritize Team Lead + Code Reviewer + Buddy as core 3. Scout and Bounty Hunter can be simpler. |
| Nosana deployment issues | Deploy basic container in Week 1. Don't wait. |
| Inter-agent messaging complexity | Start with simple room-based messaging. Upgrade if time allows. |
| Qwen model limitations | Design prompts within model strengths. Test early. Allow API key override. |
| Chat room frontend takes too long | Minimal but clean UI. Functionality over flashy animations. |
| Bounty platform APIs break | Cache results. Have fallback data. This agent can be simpler for demo. |

---

## Strategic Notes

- **Deploy to Nosana in Week 1.** Most competitors leave deployment to the last minute. Get it working early and iterate.

- **UX is your unfair advantage.** You're a product designer building a dev tool. 90% of entries will be terminal-style chatbots.

- **The agent conversations ARE the product.** The magic is watching them collaborate. Every demo moment should show 2+ agents interacting.

- **Buddy is the secret weapon.** Nobody else will build an agent that reminds you to eat and celebrates your wins. Unforgettable.

- **Keep each agent focused.** Resist feature creep. Depth over breadth.

- **Name customization is a differentiator.** 30 minutes to implement, makes the whole experience feel personal.

- **Demo video is everything.** Script it. Rehearse it. Show the most impressive multi-agent interaction first.

- **Documentation is free points.** Clean README with architecture diagram = easy 10%.

---

## Future Roadmap (Post-Competition)

- Virtual Office Mode (Gather.town-style spatial interface)
- Voice interaction (talk to your agents)
- Mobile app (check in with your team on the go)
- Team mode (multiple developers sharing an agent squad)
- Custom agent creation (users add their own specialized agents)
- Integration with real tools (GitHub, Slack, Jira, Calendar)
- On-chain reputation system (track hackathon wins, bounties completed)
- Agent marketplace (share and download community-built agents)
- NFT avatars — mint and equip unique NFT avatars for your agents on-chain
- Chat room background customization — themes, colors, and custom backgrounds

---

*Built by Joshua — Full Stack, Smart Contract, AI Engineer & Product Designer*
