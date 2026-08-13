import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { BaseController } from './common/controllers/base.controller';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController extends BaseController {
  constructor(private readonly appService: AppService) {
    super();
  }

  @Get()
  @Public()
  getHello(): string {
    return this.appService.getHello();
  }
}
