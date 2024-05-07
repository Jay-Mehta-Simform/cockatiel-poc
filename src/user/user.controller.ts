import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Logger,
  Post,
  Query,
} from '@nestjs/common';
import { AddUser } from './dto';
import { UserService } from './user.service';
import CircuitBreaker from 'opossum';
const OpossumCircuitBreaker = require('opossum');

@Controller('user')
export class UserController {
  private readonly logger = new Logger(UserController.name);
  private opossumBreaker: CircuitBreaker;

  constructor(private readonly userService: UserService) {
    this.opossumBreaker = new OpossumCircuitBreaker(
      this.userService.getUserWithOpossum.bind(this.userService),
      {
        timeout: 3000,
        errorThresholdPercentage: 10,
        resetTimeout: 3000,
      },
    );
    this.opossumBreaker.fallback(() => {
      this.logger.error('Handle failing network');
    }
    );
    this.opossumBreaker.on('fallback', () => {
      this.logger.verbose('Fallback event fired!');
      throw new InternalServerErrorException('Sorry the network seems to be exhausted.');
    }
    );
  }

  @Post('/')
  async addUser(@Body() data: AddUser) {
    return this.userService.addUser(data);
  }

  @Get('retry')
  async getUserWithRetry(@Query('email') email: string) {
    return this.userService.getUserWithRetry(email);
  }

  @Get('breaker')
  async getUserWithCircuitBreaker(@Query('email') email: string) {
    return this.userService.getUserWithCircuitBreaker(email);
  }

  @Get('timeout')
  async getUserWithTimeout(@Query('email') email: string) {
    return this.userService.someTimeConsumingTask(email);
  }

  @Get('bulkhead')
  async getUserWithBulkHead(@Query('email') email: string) {
    return this.userService.concurrentCallsNotRecommended(email);
  }

  @Get('fallback')
  async getUserWithFallback(@Query('email') email: string) {
    return this.userService.failingFunction(email);
  }

  @Get('merged')
  async getUserWithMerged(@Query('email') email: string) {
    return this.userService.networkExhaustion(email);
  }

  @Get('oBreaker')
  async getUserWithOpossum(@Query('email') email: string) {
    try {
      const user = await this.opossumBreaker.call(email);
      return user;
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  @Get('oStats')
  async getStats() {
    return { 
      stats: this.opossumBreaker.stats, 
      status: this.opossumBreaker.status, 
      group: this.opossumBreaker.group, 
      state: this.opossumBreaker.toJSON(), 
      warmup: this.opossumBreaker.warmUp,
      // And much more... 
    }
  }
}
