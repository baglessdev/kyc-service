import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AppModule } from '../../src/app.module';
import { AllExceptionsFilter } from '../../src/common/filters/http-exception.filter';

/**
 * Helper to create test application with in-memory MongoDB
 */
export class TestAppHelper {
  private static mongoServer: MongoMemoryServer;
  private static app: INestApplication;

  /**
   * Create and initialize test application
   */
  static async createTestApp(): Promise<INestApplication> {
    // Start in-memory MongoDB
    this.mongoServer = await MongoMemoryServer.create();
    const mongoUri = this.mongoServer.getUri();

    // Set environment variables for testing
    process.env.MONGODB_URI = mongoUri;
    process.env.SUMSUB_APP_TOKEN = 'test-app-token';
    process.env.SUMSUB_SECRET_KEY = 'test-secret-key';
    process.env.SUMSUB_BASE_URL = 'https://api.sumsub.com';
    process.env.SUMSUB_WEBHOOK_SECRET = 'test-webhook-secret';

    // Create testing module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = moduleFixture.createNestApplication();

    // Apply same configuration as main.ts
    this.app.useGlobalFilters(new AllExceptionsFilter());
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    this.app.enableCors();

    await this.app.init();

    return this.app;
  }

  /**
   * Get the current test application
   */
  static getApp(): INestApplication {
    if (!this.app) {
      throw new Error('Test app not initialized. Call createTestApp() first.');
    }
    return this.app;
  }

  /**
   * Close test application and stop MongoDB
   */
  static async closeTestApp(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }
    if (this.mongoServer) {
      await this.mongoServer.stop();
    }
  }

  /**
   * Get MongoDB URI for direct database access if needed
   */
  static getMongoUri(): string {
    if (!this.mongoServer) {
      throw new Error('MongoDB server not started');
    }
    return this.mongoServer.getUri();
  }
}
