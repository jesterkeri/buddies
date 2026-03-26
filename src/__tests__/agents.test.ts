import { describe, it, expect } from 'bun:test';
import project from '../index.ts';

describe('Buddies Multi-Agent Project', () => {
  it('should export 5 agents', () => {
    expect(project.agents).toHaveLength(5);
  });

  it('should have unique agent names', () => {
    const names = project.agents.map((a) => a.character.name);
    expect(new Set(names).size).toBe(5);
    expect(names).toContain('Chief');
    expect(names).toContain('Hawk');
    expect(names).toContain('Radar');
    expect(names).toContain('Tracker');
    expect(names).toContain('Beans');
  });

  it('each agent should have required plugins listed', () => {
    for (const agent of project.agents) {
      expect(agent.character.plugins).toContain('@elizaos/plugin-bootstrap');
      expect(agent.character.plugins).toContain('@elizaos/plugin-sql');
      expect(agent.character.plugins).toContain('@elizaos/plugin-openai');
    }
  });

  it('each agent should have a custom plugin', () => {
    for (const agent of project.agents) {
      expect(agent.plugins).toBeDefined();
      expect(agent.plugins!.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('each agent should have a system prompt', () => {
    for (const agent of project.agents) {
      expect(agent.character.system).toBeDefined();
      expect(agent.character.system!.length).toBeGreaterThan(100);
    }
  });

  it('each agent should have bio entries', () => {
    for (const agent of project.agents) {
      expect(agent.character.bio).toBeDefined();
      expect(Array.isArray(agent.character.bio) ? agent.character.bio.length : 1).toBeGreaterThan(0);
    }
  });

  it('each agent should have an init function', () => {
    for (const agent of project.agents) {
      expect(agent.init).toBeDefined();
      expect(typeof agent.init).toBe('function');
    }
  });

  it('only Beans should mention emojis in style', () => {
    for (const agent of project.agents) {
      const allStyle = agent.character.style?.all?.join(' ') || '';
      if (agent.character.name === 'Beans') {
        expect(allStyle.toLowerCase()).toContain('emoji');
      } else {
        expect(allStyle.toLowerCase()).toContain('never use emoji');
      }
    }
  });
});
