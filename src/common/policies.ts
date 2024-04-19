import {
  ConsecutiveBreaker,
  ConstantBackoff,
  TimeoutStrategy,
  circuitBreaker,
  handleAll,
  handleWhen,
  retry,
  timeout,
  wrap,
} from 'cockatiel';
import { HttpError } from 'src/interfaces';

// Retry 3 times for any error
const RetryPolicy = retry(
  handleWhen((err) => err instanceof HttpError),
  {
    maxAttempts: 3,
    backoff: new ConstantBackoff(1 * 1000), // Time between retries
  },
);

const CircuitBreakerPolicy = circuitBreaker(handleAll, {
  breaker: new ConsecutiveBreaker(4),
  halfOpenAfter: 5 * 1000,
});

const TimeoutPolicy = timeout(30, {
  abortOnReturn: true,
  strategy: TimeoutStrategy.Aggressive,
});

const UnstableNetworkPolicy = wrap(CircuitBreakerPolicy, RetryPolicy);

export const POLICY = {
  RetryPolicy,
  CircuitBreakerPolicy,
  UnstableNetworkPolicy,
  TimeoutPolicy,
};
