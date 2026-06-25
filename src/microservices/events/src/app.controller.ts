import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { KafkaService } from './kafka.service';

@Controller('api/events')
export class AppController {
  constructor(private readonly kafkaService: KafkaService) {}

  @Get('health')
  getHealth() {
    return { status: true };
  }

  @Post('movie')
  @HttpCode(HttpStatus.CREATED)
  async createMovieEvent(@Body() body: any) {
    await this.kafkaService.sendMessage('movie-events', body);
    return { status: 'success' };
  }

  @Post('user')
  @HttpCode(HttpStatus.CREATED)
  async createUserEvent(@Body() body: any) {
    await this.kafkaService.sendMessage('user-events', body);
    return { status: 'success' };
  }

  @Post('payment')
  @HttpCode(HttpStatus.CREATED)
  async createPaymentEvent(@Body() body: any) {
    await this.kafkaService.sendMessage('payment-events', body);
    return { status: 'success' };
  }
}
