import { Body, Controller, Get, Logger, Post, Query } from '@nestjs/common';
import { IPolicy, Policy, TaskCancelledError, TimeoutPolicy } from 'cockatiel';
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

  @Get('/')
  async getUser(@Query('email') email: string) {
    try {
      const data = await this.policy.execute(
        // Depicts slow network, function works only if bandwidth utilization is less than 80%
        (context) => this.userService.someTimeConsumingTask(email, context),
      );
      console.log(data);
      return data;
    } catch (e) {
      if (e instanceof TaskCancelledError) {
        return 'database timed out';
      } else {
        throw e;
      }
    }
  }
}
