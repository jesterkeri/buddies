import { type Plugin, type Route, type RouteRequest, type RouteResponse, type IAgentRuntime, logger } from '@elizaos/core';
import { agentStateManager, agentStateProvider, AgentStatus } from './agent-state.ts';
import { mentionProvider } from './mention-provider.ts';
import { bootstrapTeamChannel } from './team-channel.ts';

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

const buddiesPlugin: Plugin = {
  name: 'buddies-plugin',
  description: 'Shared team coordination — state tracking, mention detection, channel bootstrap',
  providers: [agentStateProvider, mentionProvider],
  routes: [stateRoute],
  init: async (_config, runtime) => {
    const agentName = runtime.character.name;

    // Set initial state
    agentStateManager.setState(agentName, AgentStatus.IDLE);

    // Only Chief bootstraps the team channel (first agent in array)
    if (agentName === 'Chief') {
      await bootstrapTeamChannel(runtime).catch((err) => {
        logger.error(`[BUDDIES] Team channel bootstrap failed: ${err}`);
      });
    }
  },
};

export default buddiesPlugin;
