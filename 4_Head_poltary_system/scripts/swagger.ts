import { writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

async function generateSwagger() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('LabVerse API')
    .setDescription('Complete project management and CRM system API')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT-auth')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const outputFile = 'swagger.json';
  writeFileSync(outputFile, JSON.stringify(document, null, 2));

  const requiredPaths = [
    '/api/v1/vehicles',
    '/api/v1/vehicles/{id}',
    '/auth/login',
    '/auth/register',
  ];

  const missingPaths = requiredPaths.filter((path) => !document.paths?.[path]);
  if (missingPaths.length > 0) {
    console.error(`Swagger verification failed. Missing paths: ${missingPaths.join(', ')}`);
    process.exit(1);
  }

  const foundTags = new Set<string>();
  for (const path of Object.values(document.paths || {})) {
    for (const method of Object.values(path as any) as Array<Record<string, any>>) {
      if (Array.isArray(method.tags)) {
        method.tags.forEach((tag: string) => foundTags.add(tag));
      }
    }
  }

  const requiredTags = ['Vehicles', 'Auth'];
  const missingTags = requiredTags.filter((tag) => !foundTags.has(tag));
  if (missingTags.length > 0) {
    console.error(`Swagger verification failed. Missing tags: ${missingTags.join(', ')}`);
    process.exit(1);
  }

  console.log(`Swagger document generated at ${outputFile}`);
  console.log('Swagger endpoint verification passed for:', requiredPaths.join(', '));
  await app.close();
}

generateSwagger().catch((error) => {
  console.error('Failed to generate Swagger document:', error);
  process.exit(1);
});
