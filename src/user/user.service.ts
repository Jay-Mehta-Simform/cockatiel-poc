import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { usePolicy } from 'cockatiel';
import { POLICY } from 'src/common/policies';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { AddUser } from './dto';
import { NetworkError } from 'src/common/errors';

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

  @usePolicy(POLICY.RetryPolicy)
  async getUserWithRetry(email: string) {
    // Decides whether the function will throw network error or not
    this.successCriteriaForRetry({
      timeThresholdForBandwidthRecovery: 1000,
      bandwidthUtilizationReducer: 5,
    });

    return this.userRepository.findOne({ where: { email } });
  }

  @usePolicy(POLICY.UnstableNetworkPolicy)
  async networkExhaustion(email: string) {
    this.successCriteriaForRetry();
    return this.userRepository.findOne({ where: { email } });
  }

  @usePolicy(POLICY.TimeoutPolicy)
  someTimeConsumingTask(email: string): Promise<User> {
    const delay = Math.floor(Math.random() * (2050 - 1950) + 1950);
    return new Promise((resolve) => {
      setTimeout(async () => {
        console.log('The data was found after', delay + '+ ms');
        const user = await this.userRepository.findOne({ where: { email } });
        resolve(user);
      }, delay);
    });
  }

  @usePolicy(POLICY.BulkheadPolicy)
  concurrentCallsNotRecommended(email: string) {
    console.log(
      'Execution slots available:',
      POLICY.BulkheadPolicy.executionSlots,
    );
    console.log('Queue slots available:', POLICY.BulkheadPolicy.queueSlots);

    return new Promise((resolve) => {
      setTimeout(async () => {
        const user = await this.userRepository.findOne({ where: { email } });
        resolve(user);
      }, 500);
    });
  }

  @usePolicy(POLICY.FallbackPolicy as any)
  failingFunction() {
    throw new Error('Intentional error');
  }

  successCriteriaForRetry(options?: {
    timeThresholdForBandwidthRecovery?: number;
    bandwidthUtilizationReducer?: number;
  }) {
    const timeThresholdForBandwidthRecovery =
      options.timeThresholdForBandwidthRecovery || 5 * 1000;

    const currentTime = Date.now();
    const elapsedTimeSinceLastInvocation =
      currentTime - this.lastInvocationTime;

    if (elapsedTimeSinceLastInvocation > timeThresholdForBandwidthRecovery) {
      this.bandwidthUtilization -= options.bandwidthUtilizationReducer || 10;
    }

    // Update lastInvocationTimeForRetry
    this.lastInvocationTime = currentTime;

    this.logger.verbose(
      `Current bandwidth utilization: ${this.bandwidthUtilization}%`,
    );

    if (this.bandwidthUtilization > 75)
      throw new NetworkError({
        message: 'Timed out!',
        shouldRetry: true,
      });

    this.bandwidthUtilization = Math.floor(Math.random() * (100 - 75) + 75);
  }

  //checkNetworkBandwidth() {
  //  const currentTime = Date.now();
  //  const elapsedTimeSinceLastInvocation =
  //    currentTime - this.lastInvocationTime;
  //  const timeThresholdForBandwidthRecovery = 5 * 1000;
  //  if (elapsedTimeSinceLastInvocation > timeThresholdForBandwidthRecovery) {
  //    this.bandwidthUtilization -= 10;
  //  }

  //  // Update lastInvocationTime
  //  this.lastInvocationTime = currentTime;

  //  this.logger.verbose(
  //    `Current bandwidth utilization: ${this.bandwidthUtilization}%`,
  //  );

  //  if (this.bandwidthUtilization > 75)
  //    throw new NetworkError({
  //      message: 'Timed out!',
  //      shouldRetry: true,
  //    });

  //  this.bandwidthUtilization = Math.floor(Math.random() * (100 - 75) + 75);
  //}
}
