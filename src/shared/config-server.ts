import { createServer } from 'http';
import { logger } from '@elizaos/core';
import { loadAiConfig, saveAiConfig, invalidateAiConfigCache } from './ai-config.ts';

const CONFIG_PORT = 3001;
let started = false;

/**
 * Tiny standalone HTTP server for AI config management.
 * Runs on port 3001 alongside ElizaOS (port 3000).
 * The frontend calls this directly to save/load config.
 */
export function startConfigServer(): void {
  if (started) return;
  started = true;

  const server = createServer((req, res) => {
    // CORS headers for frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // GET /config — read current config
    if (req.method === 'GET' && req.url === '/config') {
      const config = loadAiConfig();
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, data: config }));
      return;
    }

    // POST /config — save config
    if (req.method === 'POST' && req.url === '/config') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        try {
          const config = JSON.parse(body);
          saveAiConfig(config);
          invalidateAiConfigCache();
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, message: 'Config saved. Restart to apply new providers.' }));
          logger.info('[BUDDIES] AI config saved via config server');
        } catch (err) {
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
