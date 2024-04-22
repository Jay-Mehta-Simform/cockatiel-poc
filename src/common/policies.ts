import {
  ConsecutiveBreaker,
  ConstantBackoff,
  TimeoutStrategy,
  bulkhead,
  circuitBreaker,
  fallback,
  handleAll,
  handleType,
  handleWhen,
  retry,
  timeout,
  wrap,
} from 'cockatiel';
import { HttpError } from './errors';

const RetryPolicy = retry(
  handleType(HttpError, (err) => err.shouldRetry === true),
  {
    maxAttempts: 3,
    backoff: new ConstantBackoff(1 * 1000), // Time between retries
  },
);

const CircuitBreakerPolicy = circuitBreaker(
  handleWhen((err) => err instanceof HttpError),
  {
    breaker: new ConsecutiveBreaker(4),
    halfOpenAfter: 5 * 1000,
  },
);

const TimeoutPolicy = timeout(2 * 1000, {
  abortOnReturn: true,
  strategy: TimeoutStrategy.Aggressive,
});

const BulkheadPolicy = bulkhead(2, 2);

const FallbackPolicy = fallback(handleAll, () => console.log('Falling back!'));

const UnstableNetworkPolicy = wrap(CircuitBreakerPolicy, RetryPolicy);

export const POLICY = {
  RetryPolicy,
  CircuitBreakerPolicy,
  UnstableNetworkPolicy,
  TimeoutPolicy,
  BulkheadPolicy,
  FallbackPolicy,
};
