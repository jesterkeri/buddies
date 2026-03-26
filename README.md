# Buddies

### Your AI Dev Team. Always Got Your Back.

A multi-agent productivity platform for developers. Five specialized AI agents share a chat room, talk to each other, collaborate on your behalf, and keep your entire dev life running — from code quality to finding your next gig to reminding you to eat.

Built on [ElizaOS v2](https://elizaos.ai) and deployed on [Nosana](https://nosana.io) decentralized GPU network.

---

## The Team

| Agent | Name | What They Do |
|-------|------|-------------|
| **Team Lead** | Chief | Manages tasks, priorities, deadlines. Coordinates the whole squad. Triages your inbox and drafts standups. |
| **Code Reviewer** | Hawk | Reviews code, catches vulnerabilities, rates issues by severity. Brutally honest — respects clean code, roasts sloppy code. |
| **Scout** | Radar | Monitors repos, tracks dependencies, surfaces breaking changes. Pulls docs and research when you need it. |
| **Bounty Hunter** | Tracker | Scans hackathons, bug bounties, freelance gigs, grants, and jobs. Matches opportunities to your skills. |
| **Buddy** | Beans | Tracks your work sessions, reminds you to eat, finds nearby food spots, curates playlists. The team's heart and soul. |

Every agent has a distinct personality. They don't just respond to you — they talk to each other, debate, and collaborate in real-time.

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v23+
- [Bun](https://bun.sh/) (package manager)
- [Docker](https://docs.docker.com/get-docker/) (for deployment)

### Setup

```bash
# Clone the repo
git clone https://github.com/jesterkeri/buddies.git
cd buddies

# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Edit .env with your API keys / Nosana endpoint

# Start all 5 agents
elizaos start
```

Open `http://localhost:3000` to enter the chat room.

### Start Specific Agents

```bash
# Only start Chief and Beans
elizaos start -- --chief --beans
```

### Docker

```bash
docker compose up --build
```

---

## How It Works

### Chat Room

Slack-style interface where you @mention agents. They respond, reference each other, debate, and surface action items. Each agent has a distinct avatar and personality.

### Group Meetings

Call a team meeting and all 5 agents convene. Chief facilitates, each agent contributes from their domain, and the meeting ends with action items.

- **Daily Standup** — Each agent gives status. Chief summarizes priorities.
- **Sprint Planning** — Tracker presents opportunities, Radar shares research, Hawk sets quality bar, Chief builds the plan, Beans checks it's sustainable.
- **Incident Response** — Auto-triggered when Hawk finds a critical vulnerability.
- **Ad-Hoc** — Call a meeting anytime on any topic.

### Per-Agent Model Selection

Each agent can run on a different LLM provider. Set a default for all agents, then override individually:

```bash
# Default for all agents
OPENAI_API_KEY=your-key
OPENAI_API_URL=https://api.openai.com/v1

# Override Hawk with Claude for deep reasoning
HAWK_OPENAI_API_KEY=your-anthropic-key
HAWK_OPENAI_API_URL=https://api.anthropic.com/v1
```

Supported providers: OpenAI, Anthropic, Google Gemini, Llama (via Nosana), Grok, Mistral, and the competition-provided Qwen3.5-27B endpoint.

---

## Architecture

```
src/
  index.ts                  # Multi-agent entry point
  init.ts                   # Shared initialization
  chief/                    # Team Lead
    index.ts                # Character + personality
    plugins/chief/          # Task management, coordination
  hawk/                     # Code Reviewer
    index.ts
    plugins/hawk/           # Code review, security audits
  radar/                    # Scout
    index.ts
    plugins/radar/          # Research, monitoring
  tracker/                  # Bounty Hunter
    index.ts
    plugins/tracker/        # Opportunity scanning
  beans/                    # Buddy
    index.ts
    plugins/beans/          # Wellness, morale
```

All 5 agents run in a single ElizaOS process. Inter-agent communication happens via shared rooms — no network overhead. Each agent has its own plugin with isolated actions, providers, and evaluators.

---

## Testing

```bash
bun test
```

8 tests verify all agents load correctly with proper names, plugins, system prompts, and personality rules.

---

## Deployment

Deployed on Nosana's decentralized GPU network. The Nosana job definition is at `nos_job_def/nosana_buddies_job_definition.json`.

```bash
# Build and push Docker image
docker build -t joshuazekeri/buddies:latest .
docker push joshuazekeri/buddies:latest

# Deploy to Nosana using the job definition
```

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | ElizaOS v2 |
| Language | TypeScript |
| Runtime | Bun |
| LLM | Qwen3.5-27B (Nosana) + user API keys |
| Database | SQLite / PGLite |
| Deployment | Docker on Nosana GPU |
| Frontend | React + Tailwind (ElizaOS built-in) |

---

## Roadmap

- [ ] Custom chat room frontend (agent avatars, typing indicators, @mentions)
- [ ] Onboarding flow (skill profile, name your team, connect API keys)
- [ ] Virtual Office mode (spatial interface)
- [ ] Voice interaction
- [ ] Mobile app
- [ ] Custom agent creation
- [ ] On-chain reputation system
- [ ] Agent marketplace

---

Built by **Joshua** — Full Stack, Smart Contract, AI Engineer & Product Designer
