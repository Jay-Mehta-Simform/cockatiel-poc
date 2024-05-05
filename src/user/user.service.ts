import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { usePolicy } from 'cockatiel';
import { NetworkError } from 'src/common/errors';
import { POLICY } from 'src/common/policies';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { AddUser } from './dto';

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

  /**
   * A function with heavy network usage that returns user details
   * @param {string} email Email address of the user to be found
   * @throws {NetworkError} If the network bandwidth is not sufficient
   * @throws {NotFoundException} If the user does not exist
   * @returns {Promise<User>} User details
   */
  @usePolicy(POLICY.RetryPolicy)
  async getUserWithRetry(email: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) throw new NotFoundException('User does not exist!');
    // Decides whether the function will throw network error or not
    this.checkNetworkBandwidth({
      timeThresholdForBandwidthRecovery: 1000,
      bandwidthUtilizationReducer: 5,
    });
    return user;
  }

  @usePolicy(POLICY.CircuitBreakerPolicy)
  async getUserWithCircuitBreaker(email: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) throw new NotFoundException('User does not exist!');

    this.checkNetworkBandwidth({
      timeThresholdForBandwidthRecovery: 5000,
      bandwidthUtilizationReducer: 20,
    });

    return user;
  }

  @usePolicy(POLICY.TimeoutPolicy)
  someTimeConsumingTask(email: string): Promise<User> {
    const delay = Math.floor(Math.random() * (2050 - 1950) + 1950);
    return new Promise((resolve) => {
      setTimeout(async () => {
        this.logger.verbose(`The data was found after ${delay}+ ms`);
        const user = await this.userRepository.findOne({ where: { email } });
        resolve(user);
      }, delay);
    });
  }

  @usePolicy(POLICY.BulkheadPolicy)
  concurrentCallsNotRecommended(email: string) {
    this.logger.verbose(
      `Execution slots available: ${POLICY.BulkheadPolicy.executionSlots}`,
    );
    this.logger.verbose(
      `Queue slots available: ${POLICY.BulkheadPolicy.queueSlots}`,
    );

    return new Promise((resolve) => {
      setTimeout(async () => {
        const user = await this.userRepository.findOne({ where: { email } });
        resolve(user);
      }, 1000);
    });
  }

  @usePolicy(POLICY.FallbackPolicy as any)
  failingFunction(email: string) {
    if (true) throw new Error('Intentional error');
    return this.userRepository.findOne({ where: { email } });
  }

  @usePolicy(POLICY.UnstableNetworkPolicy)
  async networkExhaustion(email: string) {
    this.checkNetworkBandwidth();
    return this.userRepository.findOne({ where: { email } });
  }

  async getUserWithOpossum(email: string) {
    this.checkNetworkBandwidth({
      bandwidthUtilizationReducer: 20,
      timeThresholdForBandwidthRecovery: 1000,
    });
    return this.userRepository.findOne({ where: { email } });
  }

  private checkNetworkBandwidth(options?: {
    timeThresholdForBandwidthRecovery?: number;
    bandwidthUtilizationReducer?: number;
  }) {
    const timeThresholdForBandwidthRecovery =
      options?.timeThresholdForBandwidthRecovery || 5 * 1000;

    const currentTime = Date.now();
    const elapsedTimeSinceLastInvocation =
      currentTime - this.lastInvocationTime;

    if (elapsedTimeSinceLastInvocation > timeThresholdForBandwidthRecovery) {
      this.bandwidthUtilization -= options?.bandwidthUtilizationReducer || 10;
    }

    // Update lastInvocationTimeForRetry
    this.lastInvocationTime = currentTime;

    this.logger.verbose(
      `Current bandwidth utilization: ${this.bandwidthUtilization}%`,
    );

    if (this.bandwidthUtilization > 75)
      throw new NetworkError({
        message: 'Insufficient bandwidth!',
        shouldRetry: true,
      });

    this.bandwidthUtilization = Math.floor(Math.random() * (100 - 75) + 75);
  }
}
