import { Logger } from '@nestjs/common';
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

const logger = new Logger('Policy', { timestamp: false });

/**********************************************
 **************** Retry Policy ****************
 **********************************************/
const RetryPolicy = retry(
  handleType(HttpError, (err) => err.shouldRetry === true),
  {
    maxAttempts: 2,
    backoff: new ConstantBackoff(1 * 1000),
  },
);

RetryPolicy.onFailure(() => logger.warn('Failed to get user!'));
RetryPolicy.onSuccess(() => logger.log('Found user details!'));
RetryPolicy.onRetry(() => logger.verbose('Retrying...'));
RetryPolicy.onGiveUp(() =>
  logger.error('Retries exhausted, could not find user!'),
);

/**********************************************
 *********** Circuit Breaker Policy ***********
 **********************************************/
const CircuitBreakerPolicy = circuitBreaker(
  handleWhen((err) => err instanceof HttpError),
  {
    breaker: new ConsecutiveBreaker(2),
    halfOpenAfter: 5 * 1000,
  },
);

/**********************************************
 *************** Timeout Policy ***************
 **********************************************/
const TimeoutPolicy = timeout(2 * 1000, TimeoutStrategy.Aggressive);
TimeoutPolicy.onTimeout(() => logger.warn('Request timed out!'));

/**********************************************
 *************** Bulkhead Policy **************
 **********************************************/
const BulkheadPolicy = bulkhead(2, 2);

/**********************************************
 *************** Fallback Policy **************
 **********************************************/
const FallbackPolicy = fallback(handleAll, () => {
  logger.warn('Primary function failed, cleaning up...');
  return 'Something went wrong...';
});

/**********************************************
 *************** Merged Policy ****************
 **********************************************/
const UnstableNetworkPolicy = wrap(CircuitBreakerPolicy, RetryPolicy);

export const POLICY = {
  RetryPolicy,
  CircuitBreakerPolicy,
  UnstableNetworkPolicy,
  TimeoutPolicy,
  BulkheadPolicy,
  FallbackPolicy,
};
