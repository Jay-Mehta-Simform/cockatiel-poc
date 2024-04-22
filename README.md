# POC - Cockatiel

This is a project aimed to demonstrate the usage of the Cockatiel npm package.

## Run Locally

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

## Important Files

**[policies.ts:](./src/common/policies.ts)** All the policies that we have configured can be found here.  
**[errors.ts:](src/common/errors.ts)** All the custom made errors can be found here.  
Apart from these, we have the user controller and service files where all the relevant requests will be handled.

## About Cockatiel

As mentioned in the [documentation](https://www.npmjs.com/package/cockatiel), Cockatiel is a package that helps us achieve resiliency towards transient errors (errors that arises from a temporary condition that might be resolved or corrected quickly).  
Let's go through the features that Cockatiel provides us to make our code resilient.

### Retry

**Scenario:** Assume that you have a function which is prone to temporary network disruptions. Some of the function calls are failing due to this.

**Solution:** If we try calling the function again, it might succeed. For this, we can use the retry functionality. We can configure the max number of attempts that we should make and the time interval between each attempts.

> **_NOTE:_** _Before we go ahead and look at the implementation, not that there are two ways of implementation. One is to wrap our function call with a wrapper function and he other is using `@usePolicy` decorator. We will be using the decorator in our examples as it is more in aligned with NestJS._

- First of all, to add some data to our database, call the below route with attached body.

```
POST /user
{
    "name": "Harry Potter",
    "email": "theboywholived@hogwarts.com"
}
```

- Next, we make a request to retrieve the user but with retry policy on. Monitor the logs to know the status of your request. The function will throw error if the network utilization is more than 75%.

```
GET /user/retry/?email=theboywholived@hogwarts.com
```

- The function that will decide the fate of our request is `getUserWithRetry` in service file. As you might see, if the utilization is more than 75%, the function is programmed to throw an `NetworkError` which has `shouldRetry` as `true`. So according to our RetryPolicy defined in policy.ts, the function is called again.
