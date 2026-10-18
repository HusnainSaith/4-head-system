import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { DayBookQueryDto } from './dto/day-book-query.dto';
import { DayBookService } from './day-book.service';
@ApiTags('Reports') @ApiBearerAuth('JWT-auth')
@Controller('reports') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(RoleEnum.OWNER,RoleEnum.ACCOUNTANT)
export class DayBookController {
 constructor(private readonly service:DayBookService){}
 @Get('day-book') getDayBook(@Query() query:DayBookQueryDto){return this.service.getDayBook(query);}
}
