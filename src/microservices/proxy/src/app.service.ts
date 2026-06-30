import { Injectable, Logger } from '@nestjs/common';
import HttpProxy from 'http-proxy';
import type { Request, Response } from 'express';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly proxy = new HttpProxy({});
  
  private readonly monolithUrl = process.env.MONOLITH_URL || 'http://monolith:8080';
  private readonly moviesServiceUrl = process.env.MOVIES_SERVICE_URL || 'http://movies-service:8081';
  private readonly eventsServiceUrl = process.env.EVENTS_SERVICE_URL || 'http://events-service:8082';

  constructor() {
    this.proxy.on('error', (err) => {
      this.logger.error(`Global Proxy Error: ${err.message}`);
    });
  }

  forwardMovies(req: Request, res: Response) {
    const gradualMigration = process.env.GRADUAL_MIGRATION === 'true';
    let targetUrl = this.moviesServiceUrl;
    let routedTo = 'movies-service';

    if (gradualMigration) {
      const migrationPercent = parseInt(process.env.MOVIES_MIGRATION_PERCENT || '50', 10);
      const randomVal = Math.random() * 100;
      if (randomVal < migrationPercent) {
        targetUrl = this.moviesServiceUrl;
        routedTo = `movies-service (gradual, roll: ${randomVal.toFixed(1)} < ${migrationPercent})`;
      } else {
        targetUrl = this.monolithUrl;
        routedTo = `monolith (gradual, roll: ${randomVal.toFixed(1)} >= ${migrationPercent})`;
      }
    } else {
      targetUrl = this.moviesServiceUrl;
      routedTo = 'movies-service (migration disabled)';
    }

    this.logger.log(`Routing ${req.method} ${req.originalUrl} -> ${routedTo} (${targetUrl})`);

    this.proxy.web(req, res, { target: targetUrl }, (err) => {
      this.logger.error(`Error routing to ${targetUrl}: ${err.message}`);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Bad Gateway', details: err.message });
      }
    });
  }

  forwardEvents(req: Request, res: Response) {
    this.logger.log(`Routing ${req.method} ${req.originalUrl} -> events-service (${this.eventsServiceUrl})`);

    this.proxy.web(req, res, { target: this.eventsServiceUrl }, (err) => {
      this.logger.error(`Error routing to ${this.eventsServiceUrl}: ${err.message}`);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Bad Gateway', details: err.message });
      }
    });
  }

  forwardDefault(req: Request, res: Response) {
    this.logger.log(`Routing ${req.method} ${req.originalUrl} -> monolith (${this.monolithUrl})`);

    this.proxy.web(req, res, { target: this.monolithUrl }, (err) => {
      this.logger.error(`Error routing to ${this.monolithUrl}: ${err.message}`);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Bad Gateway', details: err.message });
      }
    });
  }
}
