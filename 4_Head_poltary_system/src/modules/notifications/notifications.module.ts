import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { join } from 'path';
import { User } from '../users/entities/user.entity';
import { Notification } from './notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Notification, User]),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const user = config.get<string>('SMTP_USER');
        return {
          transport: {
            host: config.get('SMTP_HOST', 'smtp.gmail.com'),
            port: Number(config.get('SMTP_PORT', 587)),
            secure: config.get('SMTP_SECURE', 'false') === 'true',
            auth: {
              user,
              pass: config.get<string>('SMTP_PASS'),
            },
          },
          defaults: {
            from: config.get('SMTP_FROM', `4Head ERP <${user}>`),
          },
          template: {
            dir: join(__dirname, 'templates'),
            adapter: new HandlebarsAdapter(),
            options: { strict: true },
          },
        };
      },
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsRepository, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
