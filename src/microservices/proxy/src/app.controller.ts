import { Controller, Get, All, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(@Res() res: Response) {
    return res.status(200).json({ status: true });
  }

  @All('api/movies')
  proxyMoviesRoot(@Req() req: Request, @Res() res: Response) {
    return this.appService.forwardMovies(req, res);
  }

  @All('api/movies/*path')
  proxyMoviesSub(@Req() req: Request, @Res() res: Response) {
    return this.appService.forwardMovies(req, res);
  }

  @All('api/events')
  proxyEventsRoot(@Req() req: Request, @Res() res: Response) {
    return this.appService.forwardEvents(req, res);
  }

  @All('api/events/*path')
  proxyEventsSub(@Req() req: Request, @Res() res: Response) {
    return this.appService.forwardEvents(req, res);
  }

  @All('*path')
  proxyDefault(@Req() req: Request, @Res() res: Response) {
    return this.appService.forwardDefault(req, res);
  }
}
