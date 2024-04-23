# POC - Cockatiel

This is a project aimed to demonstrate the usage of the Cockatiel npm package.

## Run Locally

<details> 
<summary> Expand </summary>
<br>

Clone the project

```bash
  git clone https://link-to-project
```

Go to the project directory

```bash
  cd cockatiel
```

Install dependencies

```bash
  npm install
```

Start the server in development mode to experiment

```bash
  npm run dev
```

By default the code will run on port 3000. Navigate to main.ts file to configure this.

</details>

## Important Files

<details> 
<summary> Expand </summary>
<br>

**[policies.ts:](./src/common/policies.ts)** All the policies that we have configured can be found here.  
**[errors.ts:](src/common/errors.ts)** All the custom made errors can be found here.  
Additionally, user controller and service files handle relevant requests.

</details>

## About Cockatiel

As mentioned in the [documentation](https://www.npmjs.com/package/cockatiel), Cockatiel is a package that helps us achieve resiliency towards transient errors (errors that arises from a temporary condition that might be resolved or corrected quickly).  
Let's go through the features that Cockatiel provides us to make our code resilient.

---

---

## Feature Implementations

### Retry

<details> 
<summary> Expand </summary>
<br>

**Scenario:** Consider a scenario where a function in our application is prone to temporary network disruptions, leading to occasional failures.

**Solution:** We can implement retry functionality using Cockatiel to increase the likelihood of successful execution. By retrying the function multiple times, we can mitigate the impact of transient errors and improve the overall resilience of our application.

> **_NOTE:_** _Before we go ahead and look at the implementation, note that there are two ways of implementation. One is to wrap our function call with a wrapper function and the other is using `@usePolicy` decorator. We will be using the decorator in our examples as it is more in aligned with NestJS._

To demonstrate the retry functionality:

#### 1. Setup

- First of all, to add some data to our database, call the below route with attached body.

```
POST /user
{
    "name": "Harry Potter",
    "email": "theboywholived@hogwarts.com"
}
```

- Configuring a retry policy that defines the maximum number of attempts and the time interval between each attempt.

```typescript
const RetryPolicy = retry(
  handleType(HttpError, (err) => err.shouldRetry === true),
  {
    maxAttempts: 3,
    backoff: new ConstantBackoff(1 * 1000),
  },
);
```

<details>
<summary><b>Understanding the policy</b></summary>

- `maxAttempts`: Specifies the maximum number of retry attempts.
- [`backoff`](https://www.npmjs.com/package/cockatiel#backoffs): Determines the time interval between retry attempts.

- If we take a look at the `getUserWithRetry` function in the service file, we can see that it can throw two types of errors. One is `NetworkError` and the other is `NotFoundException`. Since trying again with the same email on `NotFoundException` does not make sense, we need our policy to retry only when it encounters certain types of errors. The `handleType` parameter takes in a constructor and a predicate as arguments. Only if both the conditions are true, will it retry. See [Policy](https://www.npmjs.com/package/cockatiel#policy) to explore all the supported conditions.

</details>

#### 2. Implementation

- To use the policy, decorate your function as below:

```typescript
  @usePolicy(POLICY.RetryPolicy)
  async getUserWithRetry(email: string): Promise<User> {
      // Rest of the code
  }
```

- Alternatively, you can also wrap your function call with the policy's execute method:

```typescript
RetryPolicy.execute(() => getUserWithRetry(email:string))
```

#### 3. Testing

- Make a request at below route and monitor the logs.

```
GET /user/retry/?email=theboywholived@hogwarts.com
```

- If the network bandwidth utilization is more than 75%, the function will throw `NetworkError` and the retry policy will be triggered. The logs generated are from events fired by the policy. The event handlers can be found in the [policies.ts](src/common/policies.ts) file.

</details>

---

---

### Circuit Breaker

<details> 
<summary> Expand </summary>
<br>

**Scenario:** In scenarios where a function repeatedly throws transient errors and requires time to recover, continuous incoming requests can impede its recovery process.

**Solution:** Implementing Circuit Breaker functionality using Cockatiel can provide the function with the necessary time to recover from transient errors.

To demonstrate the circuit breaker functionality:

#### 1. Setup

- Configure a circuit breaker policy to specify the conditions under which the circuit should open and close.

```typescript
const CircuitBreakerPolicy = circuitBreaker(
  handleWhen((err) => err instanceof HttpError),
  {
    breaker: new ConsecutiveBreaker(2),
    halfOpenAfter: 5 * 1000,
  },
);
```

<details>
<summary><b>Understanding the policy</b></summary>

- [`breaker`](https://www.npmjs.com/package/cockatiel#breakers): Specifies the number of errors after which the policy will prevent further calls to the function.
- `halfOpenAfter`: Specifies the time interval after which the circuit transitions to a half-open state, allowing limited function calls for testing recovery.

</details>

#### 2. Testing

- Make a request at below route and monitor the logs.

```
GET /user/breaker/?email=theboywholived@hogwarts.com
```

- The scenario is similar to what we saw in retry. Depending on the network bandwidth, the function will either return user details or will throw `NetworkError`.

- After encountering two consecutive NetworkError responses, the circuit will open for 5 seconds. During this period, any incoming requests will receive an internal server exception, indicating that the circuit is open.

- After the 5-second period, the circuit transitions to a half-open state, allowing a single function call. If this call succeeds, normal operation resumes. However, if it fails, the circuit closes again for another 5 seconds.

</details>

---

---

### Timeout

<details> 
<summary> Expand </summary>
<br>

**Scenario:** Sometimes, a function may take longer than expected to execute, which could lead to poor user experience if users are kept waiting indefinitely.

**Solution:** Cockatiel offers Timeout functionality to handle such scenarios, enabling us to respond to the user prematurely if the function exceeds a specified time limit or simply do something taking into account that the function exceeded its alloted time.

> **_Note:_** _Timeout will only work with asynchronous tasks._

To demonstrate the timeout functionality:

#### 1. Setup

- Configure a timeout policy to define the conditions under which the timeout should occur and how to respond to it.

```typescript
const TimeoutPolicy = timeout(2000, TimeoutStrategy.Aggressive);
```

<details>
<summary><b>Understanding the policy</b></summary>

- `duration`: The first argument specifies the time (in milliseconds) to wait before throwing a `TaskCancelledError`.
- `strategy`: The second argument determines the strategy used. Aggressive throws TaskCancelledError immediately upon timeout, while Cooperative waits for the function to complete or throw an error before generating the timeout event.

</details>

#### 2. Testing

- Make a request at below route and monitor the logs.

```
GET /user/timeout/?email=theboywholived@hogwarts.com
```

- If the database call to retrieve user details exceeds 2000 ms, the server won't wait for the function to complete and will throw a TaskCancelledError. Otherwise, the function will successfully return the user details within the allotted time.

</details>

---

---

### Bulkhead

<details> 
<summary> Expand </summary>
<br>

**Scenario:** In scenarios where a function consumes significant resources or can lead to data integrity issues when executed concurrently, it's essential to limit the number of concurrent executions to avoid server crashes or data inconsistencies.

**Solution:** Cockatiel provides Bulkhead functionality, allowing us to control the concurrency of function executions and implement a queue system to manage incoming requests effectively.

To demonstrate the bulkhead functionality:

#### 1. Setup

- Configure a bulkhead policy to specify the conditions under which the function executions should be managed.

```typescript
const BulkheadPolicy = bulkhead(2, 2);
```

<details>
<summary><b>Understanding the policy</b></summary>

- `limit`: The first argument specifies the maximum number of concurrent function executions allowed.
- `queue`: The second argument optionally creates a queue with a specified number of slots to handle excess function calls beyond the concurrency limit.

</details>

#### 2. Testing

- To test this one, we need to use some tool that lets us make multiple concurrent requests to the same route. One such method is to use postman's collection runner and execute performance tests on this route. In our case, configure the virtual users as 6 and let the load start at 2 and ramp up.

```
GET /user/bulkhead/?email=theboywholived@hogwarts.com
```

- The `concurrentCallsNotRecommended` function should not have more than two concurrent executions. Once the limit is reached, any additional function calls will be queued until slots are available in the queue. If the queue is full, further function calls will be rejected.

</details>

---

---

### Fallback

<details> 
<summary> Expand </summary>
<br>

**Scenario:** There are situations where a function may fail repeatedly and there's a need to provide an alternative response or action to prevent complete failure.

**Solution:** Cockatiel offers Fallback functionality to handle such scenarios by providing a fallback mechanism to execute when the primary function fails.

To demonstrate the fallback functionality:

#### 1. Setup

- Configure a fallback policy to define the conditions under which the fallback should be triggered.

```typescript
const FallbackPolicy = fallback(handleAll, () => {
  logger.warn('Primary function failed, cleaning up...');
  return 'Something went wrong...';
});
```

<details>
<summary><b>Understanding the policy</b></summary>

- `handleAll`: Policy/conditions to determine the scenarios for which to use the fallback.
- `function/value`: The function/value provided as an argument to fallback will be executed/returned if the primary function fails.

</details>

#### 2. Testing

- Make a request to the specified route and monitor the behavior.

```
GET /user/fallback/?email=theboywholived@hogwarts.com
```

- The `failingFunction` function will always fail. Due to our policy, we can intercept the failure and perform relevant operations.

</details>

---

---

### Wrap

<details> 
<summary> Expand </summary>
<br>

- If we want to combine multiple policies, such as retry and circuit breaker, we can do so using the `wrap` function, which merges the policies together. It's important to note that the sequence in which you provide the policies to the `wrap` function as parameters will matter.

- A combination of retry and circuit breaker can be achieved by defining either of these policies based on requirement.

```typescript
// Combination 1
const UnstableNetworkPolicy = wrap(CircuitBreakerPolicy, RetryPolicy);

// OR

// Combination 2
const UnstableNetworkPolicy = wrap(RetryPolicy, CircuitBreakerPolicy);
```

- A combination of circuit breaker and retry (combination 1) ensures that each request is retried and if a set number of requests (not retries/attempts) fails, the circuit breaker will open the circuit.

- A combination of retry and circuit breaker (combination 2) ensures that the server retries the function calls, but if after some attempts, it still fails, the circuit breaker will step in and open the circuit, ending the retry procedure.

#### Testing:

- Make a request to the specified route and monitor the behavior.

```
GET /user/merged/?email=theboywholived@hogwarts.com
```

- You will be able to see that on the first request, the retry policy will kick in. If two consecutive requests fails, the circuit breaker will open the circuit.

</details>

---

---
