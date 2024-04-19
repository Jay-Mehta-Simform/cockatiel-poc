import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { User } from 'src/entities/user.entity';
import { NetworkError } from 'src/interfaces';
import { Repository } from 'typeorm';
import { AddUser } from './dto';
import {
  ICancellationContext,
  IPolicy,
  TaskCancelledError,
  TimeoutPolicy,
} from 'cockatiel';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private lastInvocationTime: number;
  private bandwidthUtilization: number;
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {
    this.lastInvocationTime = Date.now();
    // Initialize bandwidthUtilization with a value above 75%
    this.bandwidthUtilization = Math.floor(Math.random() * (100 - 75) + 75);
  }

  async addUser(data: AddUser) {
    return this.userRepository.save({
      name: data.name,
      email: data.email,
    });
  }

  async networkExhaustion(email: string) {
    //const bandwidthUtilization = Math.floor(Math.random() * (100 - 70) + 70);
    //this.logger.verbose(
    //  `Current bandwidth utilization: ${bandwidthUtilization}%`,
    //);

    //if (bandwidthUtilization > 75)
    //  throw new NetworkError({
    //    message: 'Timed out!',
    //    shouldRetry: true,
    //  });

    //return this.userRepository.findOne({ where: { email } });

    const currentTime = Date.now();
    const elapsedTimeSinceLastInvocation =
      currentTime - this.lastInvocationTime;
    const timeThresholdForBandwidthRecovery = 5 * 1000; // 5 seconds
    // Decrease bandwidthUtilization gradually if not invoked recently
    if (elapsedTimeSinceLastInvocation > timeThresholdForBandwidthRecovery) {
      this.bandwidthUtilization -= 10; // Decrease by 10% every 5 seconds
      if (this.bandwidthUtilization < 70) {
        this.bandwidthUtilization = 70; // Ensure utilization does not drop below 70%
      }
    }

    // Update lastInvocationTime
    this.lastInvocationTime = currentTime;

    this.logger.verbose(
      `Current bandwidth utilization: ${this.bandwidthUtilization}%`,
    );

    if (this.bandwidthUtilization > 75)
      throw new NetworkError({
        message: 'Timed out!',
        shouldRetry: true,
      });

    this.bandwidthUtilization = 90;

    return this.userRepository.findOne({ where: { email } });
  }

  //  @usePolicy(POLICY.TimeoutPolicy)
  async someTimeConsumingTask(email: string, context: ICancellationContext) {
    console.log('Function execution started');
    console.log(context);

    //const fibonacciTarget = Math.floor(Math.random() * (25 - 20) + 20);
    const fibonacciTarget = 35;
    const result = await this.fibonacci(fibonacciTarget, context.signal);
    console.log('Result', result);
    console.log(context.signal.aborted);
    return this.userRepository.findOne({ where: { email } });
  }

  async fibonacci(n: number, signal: AbortSignal) {
    // Check if the signal is aborted
    if (signal.aborted) {
      throw new TaskCancelledError('Task was cancelled due to timeout');
    }

    // Base cases
    if (n <= 1) {
      return n;
    }

    // Recursive calls with the same signal
    const left = await this.fibonacci(n - 1, signal);
    const right = await this.fibonacci(n - 2, signal);

    // Check if the signal is aborted after each recursive call
    if (signal.aborted) {
      throw new TaskCancelledError('Task was cancelled due to timeout');
    }

    // Combine results
    return left + right;
  }
}
