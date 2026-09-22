import './config/timezone';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { resolve } from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { GlobalValidationPipe } from './common/pipes/global-validation.pipe';
// import { SecurityConfig } from './config/security.config';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { csrfProtection } from './common/middleware/csrf-protection.middleware';
import { prepareDesktopDatabase } from './database/desktop-bootstrap';

function getAllowedOrigins() {
  const configured = [process.env.FRONTEND_URLS, process.env.FRONTEND_URL]
    .filter(Boolean)
    .join(',');
  const list = configured
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Add your API/Swagger and frontend domains explicitly
  // (adjust these to your real domains)
  const extra = [
    'https://adminapi.labverse.org', // API+Swagger origin
    'http://localhost:3000', // Local dev
    'http://localhost:5173', // Vite local dev
    'https://labverse.org',
    'https://www.labverse.org',
  ];
  for (const e of extra) if (!list.includes(e)) list.push(e);
  return list;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'img-src': ["'self'", 'data:', 'https:'],
          'script-src': ["'self'", "'unsafe-inline'"],
          'style-src': ["'self'", "'unsafe-inline'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    }),
  );

  // Rate limit (be gentle for Swagger)
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: Number(process.env.RATE_LIMIT_MAX ?? 1000),
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  const allowed = getAllowedOrigins();
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowed.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization, X-CSRF-Token',
    exposedHeaders: 'Authorization',
  });
  app.use(csrfProtection);

  // Global validation pipe with strict validation
  app.useGlobalPipes(new GlobalValidationPipe());
  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger documentation with proper bearer auth configuration
  const config = new DocumentBuilder()
    .setTitle('LabVerse API')
    .setDescription('Complete project management and CRM system API')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await prepareDesktopDatabase(app.get(DataSource));

  const desktopFrontendDir = process.env.DESKTOP_FRONTEND_DIR;
  if (desktopFrontendDir) {
    const frontendPath = resolve(desktopFrontendDir);
    app.useStaticAssets(frontendPath);
    app
      .getHttpAdapter()
      .getInstance()
      .get('*', (request, response, next) => {
        const acceptsHtml = request.accepts('html');
        const hasFileExtension = /\.[a-z0-9]+$/i.test(request.path);
        if (!acceptsHtml || hasFileExtension) return next();
        return response.sendFile(resolve(frontendPath, 'index.html'));
      });
  }

  const port = process.env.PORT || 3001;
  await app.listen(port, '127.0.0.1');
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger docs available at: http://localhost:${port}/api/docs`);
  return app;
}

let application: NestExpressApplication | undefined;

process.on('message', (message: { type?: string } | undefined) => {
  if (message?.type !== 'shutdown') return;
  void application?.close().finally(() => {
    if (process.connected) process.disconnect();
  });
});

bootstrap().then((app) => {
  application = app;
});
