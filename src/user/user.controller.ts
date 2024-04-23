import { Body, Controller, Get, Logger, Post, Query } from '@nestjs/common';
import { AddUser } from './dto';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

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
}
