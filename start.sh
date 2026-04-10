#!/bin/sh
# Production container start script.
#
# IMPORTANT: Per-agent LLM routing in Buddies uses character.secrets Proxy
# (see src/shared/ai-config.ts). Seeding OPENAI_API_KEY / ANTHROPIC_API_KEY
# into process.env BREAKS per-agent routing because ElizaOS core dumps all
# of process.env into character.settings.secrets, which then overrides the
# per-agent Proxy via mergeAgentSettings spread order. Every agent ends up
# with the same global key.
#
# Do NOT export OPENAI_API_KEY here. Let the Proxy do its job.
#
# We DO export OLLAMA_API_ENDPOINT if any agent uses ollama, because that
# value IS the same across agents and plugin-openai needs it for routing
# ollama agents via the OpenAI-compat endpoint at localhost:11434/v1.
CONFIG_FILE="${PWD}/data/.buddies-ai-config.json"

if [ -f "$CONFIG_FILE" ]; then
  HAS_OLLAMA=$(node -e "
    var fs = require('fs');
    try {
      var cfg = JSON.parse(fs.readFileSync('$CONFIG_FILE', 'utf-8'));
      var any = false;
      if (cfg.perAgent) {
        Object.values(cfg.perAgent).forEach(function(a) {
          if (a && a.provider === 'ollama') any = true;
        });
      }
      process.stdout.write(any ? 'yes' : 'no');
    } catch(e) {
      process.stderr.write('[PRELOAD] Error: ' + e.message + '\n');
      process.stdout.write('no');
    }
  ")
  if [ "$HAS_OLLAMA" = "yes" ]; then
    export OLLAMA_API_ENDPOINT="http://localhost:11434/api"
    echo "[PRELOAD] ollama agents detected — exported OLLAMA_API_ENDPOINT"
  fi
fi

# Clear stale database if it exists from a previous build
rm -rf /app/.eliza/.elizadb 2>/dev/null
exec elizaos start
