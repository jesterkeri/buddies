import {
  type IAgentRuntime,
  type Action,
  type Provider,
  type Evaluator,
  logger,
} from '@elizaos/core';

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
  logger.info(`Character initialized: ${runtime.character.name}`);
};
