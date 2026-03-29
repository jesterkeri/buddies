import { logger } from '@elizaos/core';

// Telegram Bot API integration for Buddy
// Buddy is the ONLY agent that sends external messages
// Other agents relay through Buddy: "Hawk says: critical vulnerability found"

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export function isTelegramConfigured(): boolean {
  return TELEGRAM_BOT_TOKEN.length > 0 && TELEGRAM_CHAT_ID.length > 0;
}

async function telegramRequest(method: string, body: Record<string, any>): Promise<any> {
  if (!isTelegramConfigured()) {
    logger.warn('[BEANS-TG] Telegram not configured — skipping message');
    return null;
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error(`[BEANS-TG] Telegram API error (${res.status}): ${text}`);
      return null;
    }

    return res.json();
  } catch (err) {
    logger.error(`[BEANS-TG] Telegram request failed: ${err}`);
    return null;
  }
}

// Send a plain text message
export async function sendTelegramMessage(text: string): Promise<boolean> {
  const result = await telegramRequest('sendMessage', {
    chat_id: TELEGRAM_CHAT_ID,
    text,
    parse_mode: 'Markdown',
  });
  return result?.ok ?? false;
}

// Buddy sends a break reminder
export async function sendBreakReminder(minutesWorked: number): Promise<boolean> {
  const message = `☕ *BUDDY HERE!*\n\nYou've been working for ${minutesWorked} minutes straight. Time to take a break!\n\n🧘 Stretch, hydrate, rest your eyes.\n\n_Your Buddies team is still on it while you recharge._`;
  return sendTelegramMessage(message);
}

// Buddy relays another agent's message
export async function relayAgentMessage(agentName: string, message: string): Promise<boolean> {
  const emoji = getAgentEmoji(agentName);
  const text = `${emoji} *${agentName} says:*\n${message}\n\n_— relayed by Buddy 🤖_`;
  return sendTelegramMessage(text);
}

// Buddy sends an opportunity alert from Bounty Hunter
export async function sendOpportunityAlert(title: string, match: string, prize: string): Promise<boolean> {
  const message = `💰 *NEW OPPORTUNITY*\n\n*${title}*\nSkill Match: ${match}\nPrize: ${prize}\n\n_Bounty Hunter found this for you. Check the Command Center for details!_`;
  return sendTelegramMessage(message);
}

// Buddy sends a security alert from Hawk
export async function sendSecurityAlert(severity: string, description: string): Promise<boolean> {
  const emoji = severity === 'CRITICAL' ? '🚨' : '⚠️';
  const message = `${emoji} *SECURITY ALERT — ${severity}*\n\n${description}\n\n_Hawk flagged this. Chief is reprioritizing. Check the Command Center._`;
  return sendTelegramMessage(message);
}

// Buddy celebrates a win
export async function sendCelebration(achievement: string): Promise<boolean> {
  const message = `🎉🚀 *ACHIEVEMENT UNLOCKED!*\n\n${achievement}\n\n_Great work! You earned this. — Buddy_`;
  return sendTelegramMessage(message);
}

// Daily standup summary from Chief (relayed by Buddy)
export async function sendStandupSummary(summary: string): Promise<boolean> {
  const message = `📋 *DAILY STANDUP — Chief's Summary*\n\n${summary}\n\n_Relayed by Buddy. Open the Command Center for full details._`;
  return sendTelegramMessage(message);
}

function getAgentEmoji(name: string): string {
  switch (name) {
    case 'Chief': return '🎯';
    case 'Hawk': return '🔍';
    case 'Radar': return '📡';
    case 'Bounty Hunter': return '💰';
    case 'Buddy': return '☕';
    default: return '🤖';
  }
}
