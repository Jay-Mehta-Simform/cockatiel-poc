import { NetworkError } from 'src/interfaces';
import { POLICY } from './policies';

export const Scenario = {
  UnstableNetwork: {
    policy: POLICY.UnstableNetworkPolicy,
    error: new NetworkError({
      message: 'Unstable network!',
      shouldRetry: true,
    }),
  },
};
