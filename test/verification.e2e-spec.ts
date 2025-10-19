import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TestAppHelper } from './helpers/test-app.helper';
import { SumsubMockHelper } from './helpers/sumsub-mock.helper';
import { TestDataHelper } from './helpers/test-data.helper';

describe('Verification Flow (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await TestAppHelper.createTestApp();
  });

  afterAll(async () => {
    await TestAppHelper.closeTestApp();
  });

  afterEach(() => {
    SumsubMockHelper.cleanAll();
  });

  describe('POST /api/v1/verifications/initiate', () => {
    it('should successfully initiate verification for new user', async () => {
      // Arrange
      const dto = TestDataHelper.createInitiateVerificationDto();
      SumsubMockHelper.mockCompleteFlow();

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/verifications/initiate')
        .send(dto)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('verificationId');
      expect(response.body).toHaveProperty('applicantId');
      expect(response.body).toHaveProperty('accessToken', 'act-test-token-123');
      expect(response.body).toHaveProperty('expiresAt');
      expect(response.body.verificationId).toMatch(/^ver_/);
    });

    it('should reject duplicate verification for user with active verification', async () => {
      // Arrange
      const dto = TestDataHelper.createInitiateVerificationDto({
        userId: 'duplicate-user-123',
      });
      SumsubMockHelper.mockCompleteFlow();

      // Create first verification
      await request(app.getHttpServer())
        .post('/api/v1/verifications/initiate')
        .send(dto)
        .expect(201);

      // Mock again for second attempt
      SumsubMockHelper.mockCompleteFlow();

      // Act - Try to create duplicate
      const response = await request(app.getHttpServer())
        .post('/api/v1/verifications/initiate')
        .send(dto)
        .expect(409);

      // Assert
      expect(response.body.message).toContain('active verification');
    });

    it('should validate required fields', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/verifications/initiate')
        .send({
          userId: 'test-user',
          // Missing required fields
        })
        .expect(400);

      // Assert
      expect(response.body.message).toBeDefined();
    });

    it('should validate email format', async () => {
      // Arrange
      const dto = TestDataHelper.createInitiateVerificationDto({
        email: 'invalid-email',
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/verifications/initiate')
        .send(dto)
        .expect(400);

      // Assert
      expect(response.body.message).toContain('email');
    });

    it('should handle multiple concurrent users', async () => {
      // Arrange
      const users = TestDataHelper.createMultipleUsers(3);

      // Mock for all users
      users.forEach(() => SumsubMockHelper.mockCompleteFlow());

      // Act - Create all verifications concurrently
      const promises = users.map((user) =>
        request(app.getHttpServer())
          .post('/api/v1/verifications/initiate')
          .send(user)
          .expect(201),
      );

      const responses = await Promise.all(promises);

      // Assert
      const verificationIds = responses.map((r) => r.body.verificationId);
      const uniqueIds = new Set(verificationIds);
      expect(uniqueIds.size).toBe(3); // All IDs should be unique
    });
  });

  describe('GET /api/v1/verifications/:verificationId', () => {
    it('should return verification status', async () => {
      // Arrange - Create a verification first
      const dto = TestDataHelper.createInitiateVerificationDto();
      SumsubMockHelper.mockCompleteFlow();

      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/verifications/initiate')
        .send(dto)
        .expect(201);

      const verificationId = createResponse.body.verificationId;

      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/v1/verifications/${verificationId}`)
        .expect(200);

      // Assert
      expect(response.body.verificationId).toBe(verificationId);
      expect(response.body.status).toBe('initiated');
      expect(response.body.userId).toBe(dto.userId);
    });

    it('should return 404 for non-existent verification', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/api/v1/verifications/ver_nonexistent')
        .expect(404);

      // Assert
      expect(response.body.message).toContain('not found');
    });
  });

  describe('GET /api/v1/verifications/user/:userId', () => {
    it('should return all verifications for a user', async () => {
      // Arrange - Create verification
      const dto = TestDataHelper.createInitiateVerificationDto({
        userId: 'multi-verify-user',
      });
      SumsubMockHelper.mockCompleteFlow();

      await request(app.getHttpServer())
        .post('/api/v1/verifications/initiate')
        .send(dto)
        .expect(201);

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/v1/verifications/user/multi-verify-user')
        .expect(200);

      // Assert
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].userId).toBe('multi-verify-user');
    });

    it('should return empty array for user with no verifications', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/api/v1/verifications/user/no-verifications-user')
        .expect(200);

      // Assert
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('POST /api/v1/verifications/:verificationId/refresh-token', () => {
    it('should refresh access token for active verification', async () => {
      // Arrange - Create verification
      const dto = TestDataHelper.createInitiateVerificationDto({
        userId: 'refresh-token-user',
      });
      SumsubMockHelper.mockCompleteFlow();

      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/verifications/initiate')
        .send(dto)
        .expect(201);

      const verificationId = createResponse.body.verificationId;

      // Mock new token generation
      SumsubMockHelper.mockGenerateAccessToken('act-new-token-456');

      // Act
      const response = await request(app.getHttpServer())
        .post(`/api/v1/verifications/${verificationId}/refresh-token`)
        .expect(200);

      // Assert
      expect(response.body.accessToken).toBe('act-new-token-456');
      expect(response.body.expiresAt).toBeDefined();
    });

    it('should return 404 for non-existent verification', async () => {
      // Act
      await request(app.getHttpServer())
        .post('/api/v1/verifications/ver_nonexistent/refresh-token')
        .expect(404);
    });
  });

  describe('Complete KYC Flow', () => {
    it('should complete full verification lifecycle from initiate to approved', async () => {
      // Step 1: Initiate verification
      const dto = TestDataHelper.createInitiateVerificationDto({
        userId: 'complete-flow-user',
        email: 'complete@example.com',
      });
      const applicantId = 'complete-flow-applicant';
      SumsubMockHelper.mockCreateApplicant(applicantId);
      SumsubMockHelper.mockGenerateAccessToken('act-complete-flow');

      const initiateResponse = await request(app.getHttpServer())
        .post('/api/v1/verifications/initiate')
        .send(dto)
        .expect(201);

      const verificationId = initiateResponse.body.verificationId;
      expect(initiateResponse.body.accessToken).toBe('act-complete-flow');

      // Step 2: Check initial status
      const statusResponse1 = await request(app.getHttpServer())
        .get(`/api/v1/verifications/${verificationId}`)
        .expect(200);

      expect(statusResponse1.body.status).toBe('initiated');

      // Step 3: Simulate user submitting documents (webhook: pending)
      const pendingPayload = SumsubMockHelper.createWebhookPayload(applicantId);
      pendingPayload.type = 'applicantPending';
      const pendingSignature = SumsubMockHelper.generateWebhookSignature(
        pendingPayload,
        'test-webhook-secret',
      );

      await request(app.getHttpServer())
        .post('/api/v1/webhooks/sumsub')
        .set('X-Payload-Digest', pendingSignature)
        .send(pendingPayload)
        .expect(200);

      // Step 4: Check status after submission
      const statusResponse2 = await request(app.getHttpServer())
        .get(`/api/v1/verifications/${verificationId}`)
        .expect(200);

      expect(statusResponse2.body.status).toBe('in_review');

      // Step 5: Simulate Sumsub review completion (webhook: approved)
      const approvedPayload = SumsubMockHelper.createWebhookPayload(
        applicantId,
        'GREEN',
      );
      const approvedSignature = SumsubMockHelper.generateWebhookSignature(
        approvedPayload,
        'test-webhook-secret',
      );

      await request(app.getHttpServer())
        .post('/api/v1/webhooks/sumsub')
        .set('X-Payload-Digest', approvedSignature)
        .send(approvedPayload)
        .expect(200);

      // Step 6: Check final status
      const finalStatusResponse = await request(app.getHttpServer())
        .get(`/api/v1/verifications/${verificationId}`)
        .expect(200);

      expect(finalStatusResponse.body.status).toBe('approved');
      expect(finalStatusResponse.body.reviewResult).toBeDefined();
      expect(finalStatusResponse.body.reviewResult.reviewAnswer).toBe('GREEN');
    });
  });
});
