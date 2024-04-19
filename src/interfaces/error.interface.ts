export type HttpErrorOptions = {
  message: string;
  statusCode: number;
  shouldRetry: boolean;
};

export type NetworkErrorOptions = {
  message: string;
  shouldRetry: boolean;
};

export type ResourceExhaustedErrorOptions = {
  message: string;
  shouldRetry: boolean;
};

export class HttpError extends Error {
  constructor(options: HttpErrorOptions) {
    super(options.message);
    this.statusCode = options.statusCode;
    this.shouldRetry = options.shouldRetry;
  }
  statusCode: number;
  shouldRetry: boolean;
}

export class NetworkError extends HttpError {
  constructor(options: NetworkErrorOptions) {
    super({
      message: options.message,
      shouldRetry: options.shouldRetry,
      statusCode: 599,
    });
  }
}

export class ResourceExhaustedError extends HttpError {
  constructor(options: ResourceExhaustedErrorOptions) {
    super({
      message: options.message,
      shouldRetry: options.shouldRetry,
      statusCode: 507,
    });
  }
}
