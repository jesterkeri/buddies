import { type Plugin, type Route, type RouteRequest, type RouteResponse, type IAgentRuntime, logger } from '@elizaos/core';
import { agentStateManager, agentStateProvider, AgentStatus } from './agent-state.ts';
import { mentionProvider } from './mention-provider.ts';
import { connectionStatusProvider } from './connection-provider.ts';
import { bootstrapTeamChannel } from './team-channel.ts';
import { startAutonomousLoops } from './autonomous-loops.ts';
import { loadAiConfig, saveAiConfig, invalidateAiConfigCache, type AiConfigState } from './ai-config.ts';
import { startConfigServer } from './config-server.ts';

let autonomousStarted = false;

const stateRoute: Route = {
  type: 'GET',
  path: '/api/buddies/states',
  public: true,
  name: 'buddies-states',
  handler: async (_req: RouteRequest, res: RouteResponse, _runtime: IAgentRuntime) => {
    const states = agentStateManager.getAllStates();
    res.status(200).json({ success: true, data: states });
  },
};

// AI config routes handled by standalone config server on port 3001
// (ElizaOS plugin routes are unreliable with plugin-openai loaded)

const buddiesPlugin: Plugin = {
  name: 'buddies-plugin',
  description: 'Shared team coordination — state tracking, mention detection, channel bootstrap',
  providers: [agentStateProvider, mentionProvider, connectionStatusProvider],
  routes: [stateRoute],
  init: async (_config, runtime) => {
    const agentName = runtime.character.name;

    // Set initial state
    agentStateManager.setState(agentName, AgentStatus.IDLE);

    // Any agent can bootstrap the team channel (first to run wins, others skip)
    await bootstrapTeamChannel(runtime).catch((err) => {
      logger.error(`[BUDDIES] Team channel bootstrap failed for ${agentName}: ${err}`);
    });

    // Start config server once (handles frontend AI config saves)
    startConfigServer();

    // Start autonomous loops once (first agent to init wins)
    if (!autonomousStarted) {
      autonomousStarted = true;
      // Delay to allow all agents and team channel to fully initialize
      setTimeout(() => {
        startAutonomousLoops();
        logger.info('[BUDDIES] Autonomous agent loops started');
      }, 15_000);
    }
  },
};

export default buddiesPlugin;
