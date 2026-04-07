# Buddies — Claude Code Instructions

## Project Overview
Multi-agent productivity platform for developers. 5 specialized AI agents share a chat room, talk to each other, and collaborate on the user's behalf. Built on ElizaOS v2, deployed on Nosana decentralized GPU network.

**Competition**: Nosana Builders: ElizaOS Challenge — $3K USDC, deadline April 14, 2026.

## Tech Stack
- **Framework**: ElizaOS v2 (TypeScript)
- **Runtime**: Bun
- **LLM**: qwen3-nothink via Ollama locally (@elizaos/plugin-ollama), Qwen3.5-27B via Nosana for deployment (@elizaos/plugin-openai)
- **Database**: SQLite / PGLite (via @elizaos/plugin-sql)
- **Deployment**: Docker on Nosana GPU network
- **Frontend**: ElizaOS built-in web UI (custom React + Tailwind chat room planned)

## The 5 Agents
| Agent | Default Name | Role | Plugin |
|-------|-------------|------|--------|
| Team Lead | Chief | Task management, coordination, email, scheduling | chief-plugin |
| Code Reviewer | Hawk | Code review, security audits, testing | hawk-plugin |
| Scout | Radar | Research, monitoring, documentation | radar-plugin |
| Bounty Hunter | Bounty Hunter | Opportunity scanning, skill matching | tracker-plugin |
| Buddy | Buddy | Wellness, breaks, location recs, morale | beans-plugin |

## Project Structure
```
src/
  index.ts              # Multi-agent entry point (Project export)
  init.ts               # Shared agent initialization
  {agent}/
    index.ts            # Character definition + ProjectAgent export
    plugins/{agent}/
      index.ts          # Plugin (actions, providers, evaluators)
      actions/          # Agent-specific actions
```

## Commands
```bash
bun install             # Install dependencies
bun test                # Run tests
elizaos start           # Start all 5 agents (web UI at localhost:3000)
elizaos dev             # Dev mode with hot reload
elizaos start -- --chief --beans  # Start specific agents only
docker compose up --build         # Containerized run
```

## Branch Strategy
- **main** — stable releases only
- **staging** — integration branch, all work merges here first
- Only Joshua's branches should be pushed; never force-push main or staging

## Architecture Decisions
- **Single container, multi-agent**: All 5 agents run in one ElizaOS process. Inter-agent messaging via shared rooms — no network overhead.
- **Plugin-per-agent**: Each agent has its own plugin directory. Keeps responsibilities isolated and independently testable.
- **Per-agent model config**: Each character reads `{AGENT_NAME}_OLLAMA_API_ENDPOINT` env vars with fallback to global `OLLAMA_API_ENDPOINT`. Allows different LLM providers per agent.
- **the-org pattern**: Project structure follows elizaOS/the-org (official multi-agent reference).

## Key Files
- `src/index.ts` — Entry point, imports all agents, exports Project
- `src/{agent}/index.ts` — Character definition with personality, system prompt, style
- `src/{agent}/plugins/{agent}/index.ts` — Plugin with actions/providers/evaluators
- `Buddies_Battle_Plan.md` — Full competition strategy and feature spec
- `PLANS.md` — Step-by-step build plan (83 steps, 16 phases)

## Important Rules
- Buddy is the ONLY agent that uses emojis
- All other agents explicitly do NOT use emojis
- Each agent has a distinct personality — preserve these differences
- Hawk uses severity tags: CRITICAL / HIGH / MEDIUM / LOW
- Bounty Hunter leads with match % and money
- Chief speaks in numbered priorities and action items
- Radar always cites sources with links

## Environment Variables
See `.env.example` for full list. Key vars:
- `OLLAMA_API_ENDPOINT` — Ollama API base URL (default: http://127.0.0.1:11434/api)
- `OLLAMA_SMALL_MODEL` / `OLLAMA_LARGE_MODEL` — model names for Ollama
- `OLLAMA_EMBEDDING_MODEL` — embedding model (default: nomic-embed-text:latest)
- `{AGENT}_OLLAMA_API_ENDPOINT` / `{AGENT}_OLLAMA_SMALL_MODEL` — per-agent overrides
- `SERVER_PORT` — default 3000

## Testing
```bash
bun test    # 8 tests verify all agents load with correct config
```
Tests check: agent count, unique names, required plugins, custom plugins, system prompts, bio entries, init functions, and emoji style rules.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
