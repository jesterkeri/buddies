import {
  type IAgentRuntime,
  type Action,
  type Provider,
  type Evaluator,
  logger,
} from '@elizaos/core';
import { agentStateManager, AgentStatus } from './shared/agent-state.ts';

export const initCharacter = async ({
  runtime,
  actions,
  providers,
  evaluators,
}: {
  runtime: IAgentRuntime;
  actions?: Action[];
  providers?: Provider[];
  evaluators?: Evaluator[];
}): Promise<void> => {
  if (actions) {
    for (const action of actions) {
      runtime.registerAction(action);
    }
  }
  if (providers) {
    for (const provider of providers) {
      runtime.registerProvider(provider);
    }
  }
  if (evaluators) {
    for (const evaluator of evaluators) {
      runtime.registerEvaluator(evaluator);
    }
  }
  agentStateManager.setState(runtime.character.name, AgentStatus.IDLE);
  logger.info(`Character initialized: ${runtime.character.name}`);
};
