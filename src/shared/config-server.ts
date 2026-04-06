import { createServer } from 'http';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '@elizaos/core';
import { loadAiConfig, saveAiConfig, invalidateAiConfigCache } from './ai-config.ts';

import { DATA_DIR } from './constants.ts';

const CONFIG_PORT = 3001;
const SESSION_PATH = join(DATA_DIR, '.buddies-session-config.json');
const TASKS_PATH = join(DATA_DIR, '.buddies-tasks.json');
const ONBOARDING_PATH = join(DATA_DIR, '.buddies-onboarding.json');
let started = false;

function loadSession(): any {
  try {
    if (existsSync(SESSION_PATH)) return JSON.parse(readFileSync(SESSION_PATH, 'utf-8'));
  } catch {}
  return {};
}

function saveSession(data: any): void {
  writeFileSync(SESSION_PATH, JSON.stringify(data, null, 2));
}

// Expose user profile for agents to read (skills, preferences)
export function getUserProfile(): { name: string; languages: string[]; frameworks: string[]; chains: string[]; experience: string } {
  try {
    if (existsSync(ONBOARDING_PATH)) {
      const d = JSON.parse(readFileSync(ONBOARDING_PATH, 'utf-8'));
      return {
        name: d.name || '',
        languages: d.languages || [],
        frameworks: d.frameworks || [],
        chains: d.chains || [],
        experience: d.experience || '',
      };
    }
  } catch {}
  return { name: '', languages: [], frameworks: [], chains: [], experience: '' };
}

// Expose for other modules to read GitHub config
export function getSessionConfig(): { githubToken: string; repoUrl: string; repoConnected: boolean; repoFullName: string } {
  const d = loadSession();
  return {
    githubToken: d.githubToken || '',
    repoUrl: d.repoUrl || '',
    repoConnected: d.repoConnected || false,
    repoFullName: d.repoFullName || '',
  };
}

/**
 * Standalone HTTP server for config + session management.
 * Runs on port 3001 alongside ElizaOS (port 3000).
 */
export function startConfigServer(): void {
  if (started) return;
  started = true;

  const server = createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // ── AI Config ──
    if (req.method === 'GET' && req.url === '/config') {
      const config = loadAiConfig();
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, data: config }));
      return;
    }

    if (req.method === 'POST' && req.url === '/config') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        try {
          const config = JSON.parse(body);
          saveAiConfig(config);
          invalidateAiConfigCache();
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, message: 'Config saved.' }));
          logger.info('[BUDDIES] AI config saved via config server');
        } catch {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
        }
      });
      return;
    }

    // ── Session (GitHub + project tracking) ──
    if (req.method === 'GET' && req.url === '/session') {
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, data: loadSession() }));
      return;
    }

    if (req.method === 'POST' && req.url === '/session') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          saveSession(data);
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, message: 'Session config saved.' }));
          logger.info('[BUDDIES] Session config saved (repo: ' + (data.repoFullName || 'none') + ')');
        } catch {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
        }
      });
      return;
    }

    // ── Onboarding (user profile/skills) ──
    if (req.method === 'GET' && req.url === '/onboarding') {
      try {
        if (existsSync(ONBOARDING_PATH)) {
          res.writeHead(200);
          res.end(readFileSync(ONBOARDING_PATH, 'utf-8'));
        } else {
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, data: {} }));
        }
      } catch {
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, data: {} }));
      }
      return;
    }

    if (req.method === 'POST' && req.url === '/onboarding') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          writeFileSync(ONBOARDING_PATH, JSON.stringify(data, null, 2));
          res.writeHead(200);
          res.end(JSON.stringify({ success: true }));
          logger.info(`[BUDDIES] Onboarding profile saved for: ${data.name || 'unknown'}`);
        } catch {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
        }
      });
      return;
    }

    // ── Tasks ──
    if (req.method === 'GET' && req.url === '/tasks') {
      try {
        if (existsSync(TASKS_PATH)) {
          const tasks = JSON.parse(readFileSync(TASKS_PATH, 'utf-8'));
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, data: tasks }));
        } else {
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, data: [] }));
        }
      } catch {
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, data: [] }));
      }
      return;
    }

    if (req.method === 'POST' && req.url === '/tasks') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        try {
          const tasks = JSON.parse(body);
          writeFileSync(TASKS_PATH, JSON.stringify(tasks, null, 2));
          res.writeHead(200);
          res.end(JSON.stringify({ success: true }));
        } catch {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  server.listen(CONFIG_PORT, () => {
    logger.info(`[BUDDIES] Config server running on port ${CONFIG_PORT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      logger.info(`[BUDDIES] Config server port ${CONFIG_PORT} already in use, skipping`);
    } else {
      logger.error(`[BUDDIES] Config server error: ${err}`);
    }
  });
}
