import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  RequestTimeoutException,
} from '@nestjs/common';
import { TaskCancelledError, TimeoutPolicy } from 'cockatiel';
import { POLICY } from 'src/common/policies';
import { AddUser } from './dto';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  private readonly logger = new Logger(UserController.name);
  private policy: TimeoutPolicy = POLICY.TimeoutPolicy;

  constructor(private readonly userService: UserService) {
    this.policy.onFailure(() => this.logger.error('Could not get user!'));
    this.policy.onSuccess(() => this.logger.log('User obtained successfully!'));
    this.policy.onTimeout(() => console.log('timeout was reached'));
  }

  @Post('/')
  async addUser(@Body() data: AddUser) {
    return this.userService.addUser(data);
  }

  @Get('/retry')
  async getUserWithRetry(@Query('email') email: string) {
    try {
      return this.userService.getUserWithRetry(email);
    } catch (error) {
      this.logger.error(error.message);
    }
  }

  @Get('/')
  async getUser(@Query('email') email: string) {
    try {
      const data = this.userService.concurrentCallsNotRecommended(email);
      return data;
    } catch (e) {
      if (e instanceof TaskCancelledError) {
        throw new RequestTimeoutException('Database timed out!');
      } else {
        throw e;
      }
    }
  }
}
