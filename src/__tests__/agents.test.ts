import { describe, it, expect } from 'bun:test';
import project from '../index.ts';
import { agentStateManager, AgentStatus } from '../shared/agent-state.ts';
import { getShouldRespondTemplate } from '../shared/should-respond.ts';

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
    expect(names).toContain('Bounty Hunter');
    expect(names).toContain('Buddy');
  });

  it('each agent should have required plugins listed', () => {
    for (const agent of project.agents) {
      expect(agent.character.plugins).toContain('@elizaos/plugin-bootstrap');
      expect(agent.character.plugins).toContain('@elizaos/plugin-sql');
      // Agents use either plugin-ollama or plugin-openai depending on config
      const hasLLMPlugin = agent.character.plugins!.some(
        (p) => p === '@elizaos/plugin-ollama' || p === '@elizaos/plugin-openai'
      );
      expect(hasLLMPlugin).toBe(true);
    }
  });

  it('each agent should have both custom and shared plugins', () => {
    for (const agent of project.agents) {
      expect(agent.plugins).toBeDefined();
      expect(agent.plugins!.length).toBeGreaterThanOrEqual(2);
      const pluginNames = agent.plugins!.map((p) => p.name);
      expect(pluginNames).toContain('buddies-plugin');
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

  it('only Buddy should mention emojis in style', () => {
    for (const agent of project.agents) {
      const allStyle = agent.character.style?.all?.join(' ') || '';
      if (agent.character.name === 'Buddy') {
        expect(allStyle.toLowerCase()).toContain('emoji');
      } else {
        expect(allStyle.toLowerCase()).toContain('never use emoji');
      }
    }
  });

  it('each agent should have a shouldRespondTemplate', () => {
    for (const agent of project.agents) {
      expect(agent.character.templates).toBeDefined();
      expect(agent.character.templates!.shouldRespondTemplate).toBeDefined();
      const template = agent.character.templates!.shouldRespondTemplate as string;
      expect(template).toContain(agent.character.name);
      expect(template).toContain('RESPOND');
      expect(template).toContain('IGNORE');
    }
  });
});

describe('Agent State Manager', () => {
  it('should set and get agent state', () => {
    agentStateManager.setState('Chief', AgentStatus.IDLE);
    const state = agentStateManager.getState('Chief');
    expect(state).toBeDefined();
    expect(state!.agentName).toBe('Chief');
    expect(state!.status).toBe(AgentStatus.IDLE);
  });

  it('should update agent state', () => {
    agentStateManager.setState('Hawk', AgentStatus.IDLE);
    agentStateManager.setState('Hawk', AgentStatus.REVIEWING, 'Reviewing withdraw()');
    const state = agentStateManager.getState('Hawk');
    expect(state!.status).toBe(AgentStatus.REVIEWING);
    expect(state!.currentTask).toBe('Reviewing withdraw()');
  });

  it('should return all agent states', () => {
    agentStateManager.setState('Chief', AgentStatus.IDLE);
    agentStateManager.setState('Hawk', AgentStatus.REVIEWING);
    agentStateManager.setState('Radar', AgentStatus.RESEARCHING);
    agentStateManager.setState('Bounty Hunter', AgentStatus.SCANNING);
    agentStateManager.setState('Buddy', AgentStatus.IDLE);
    const all = agentStateManager.getAllStates();
    expect(all.length).toBe(5);
    const names = all.map((s) => s.agentName);
    expect(names).toContain('Chief');
    expect(names).toContain('Buddy');
  });

  it('should return undefined for unknown agent', () => {
    expect(agentStateManager.getState('Unknown')).toBeUndefined();
  });
});

describe('Should Respond Template', () => {
  it('should generate template for each agent', () => {
    const agents = ['Chief', 'Hawk', 'Radar', 'Bounty Hunter', 'Buddy'];
    for (const name of agents) {
      const template = getShouldRespondTemplate(name);
      expect(template).toContain(name);
      expect(template).toContain('RESPOND');
      expect(template).toContain('IGNORE');
    }
  });

  it('should include other agents domains', () => {
    const template = getShouldRespondTemplate('Chief');
    expect(template).toContain('Hawk');
    expect(template).toContain('code review');
    expect(template).toContain('Buddy');
    expect(template).toContain('wellness');
  });

  it('should not include own name in other agents list', () => {
    const template = getShouldRespondTemplate('Hawk');
    // Hawk's domain should be listed as "Your domain", not in "Other agents"
    const otherAgentsSection = template.split('Other agents')[1] || '';
    expect(otherAgentsSection).not.toContain('- Hawk:');
  });
});
