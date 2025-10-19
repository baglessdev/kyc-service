import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TestAppHelper } from './helpers/test-app.helper';
import { SumsubMockHelper } from './helpers/sumsub-mock.helper';
import { TestDataHelper } from './helpers/test-data.helper';

describe('Webhook Flow (E2E)', () => {
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

  /**
   * Helper to create a verification and return its applicant ID
   */
  async function createVerification(userId: string = 'webhook-test-user') {
    const dto = TestDataHelper.createInitiateVerificationDto({ userId });
    const applicantId = `applicant-${userId}`;

    SumsubMockHelper.mockCreateApplicant(applicantId);
    SumsubMockHelper.mockGenerateAccessToken();

    const response = await request(app.getHttpServer())
      .post('/api/v1/verifications/initiate')
      .send(dto)
      .expect(201);

    return {
      verificationId: response.body.verificationId,
      applicantId,
    };
  }

  describe('POST /api/v1/webhooks/sumsub', () => {
    it('should process applicantReviewed webhook with GREEN result', async () => {
      // Arrange - Create verification
      const { verificationId, applicantId } = await createVerification('green-user');

      // Create webhook payload
      const payload = SumsubMockHelper.createWebhookPayload(applicantId, 'GREEN');
      const signature = SumsubMockHelper.generateWebhookSignature(
        payload,
        'test-webhook-secret',
      );

      // Act - Send webhook
      const webhookResponse = await request(app.getHttpServer())
        .post('/api/v1/webhooks/sumsub')
        .set('X-Payload-Digest', signature)
        .send(payload)
        .expect(200);

      // Assert webhook response
      expect(webhookResponse.body.success).toBe(true);

      // Assert verification status updated
      const statusResponse = await request(app.getHttpServer())
        .get(`/api/v1/verifications/${verificationId}`)
        .expect(200);

      expect(statusResponse.body.status).toBe('approved');
      expect(statusResponse.body.reviewResult.reviewAnswer).toBe('GREEN');
    });

    it('should process applicantReviewed webhook with RED (RETRY) result', async () => {
      // Arrange
      const { verificationId, applicantId } = await createVerification('retry-user');

      // Simulate pending state first
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

      // Create RED webhook payload with RETRY
      const payload = SumsubMockHelper.createWebhookPayload(
        applicantId,
        'RED',
        'RETRY',
      );
      const signature = SumsubMockHelper.generateWebhookSignature(
        payload,
        'test-webhook-secret',
      );

      // Act
      await request(app.getHttpServer())
        .post('/api/v1/webhooks/sumsub')
        .set('X-Payload-Digest', signature)
        .send(payload)
        .expect(200);

      // Assert
      const statusResponse = await request(app.getHttpServer())
        .get(`/api/v1/verifications/${verificationId}`)
        .expect(200);

      expect(statusResponse.body.status).toBe('resubmit_required');
      expect(statusResponse.body.reviewResult.reviewAnswer).toBe('RED');
      expect(statusResponse.body.reviewResult.rejectType).toBe('RETRY');
    });

    it('should process applicantReviewed webhook with RED (FINAL) result', async () => {
      // Arrange
      const { verificationId, applicantId } = await createVerification('reject-user');

      // Set to in_review first
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

      // Create RED webhook payload with FINAL
      const payload = SumsubMockHelper.createWebhookPayload(
        applicantId,
        'RED',
        'FINAL',
      );
      const signature = SumsubMockHelper.generateWebhookSignature(
        payload,
        'test-webhook-secret',
      );

      // Act
      await request(app.getHttpServer())
        .post('/api/v1/webhooks/sumsub')
        .set('X-Payload-Digest', signature)
        .send(payload)
        .expect(200);

      // Assert
      const statusResponse = await request(app.getHttpServer())
        .get(`/api/v1/verifications/${verificationId}`)
        .expect(200);

      expect(statusResponse.body.status).toBe('rejected');
      expect(statusResponse.body.reviewResult.rejectType).toBe('FINAL');
    });

    it('should reject webhook with invalid signature', async () => {
      // Arrange
      const { applicantId } = await createVerification('invalid-sig-user');
      const payload = SumsubMockHelper.createWebhookPayload(applicantId, 'GREEN');
      const invalidSignature = 'invalid-signature-hash';

      // Act
      await request(app.getHttpServer())
        .post('/api/v1/webhooks/sumsub')
        .set('X-Payload-Digest', invalidSignature)
        .send(payload)
        .expect(401);
    });

    it('should reject webhook with missing signature', async () => {
      // Arrange
      const { applicantId } = await createVerification('missing-sig-user');
      const payload = SumsubMockHelper.createWebhookPayload(applicantId, 'GREEN');

      // Act - No signature header
      await request(app.getHttpServer())
        .post('/api/v1/webhooks/sumsub')
        .send(payload)
        .expect(401);
    });

    it('should handle webhook for non-existent verification gracefully', async () => {
      // Arrange - Create payload for non-existent applicant
      const payload = SumsubMockHelper.createWebhookPayload(
        'non-existent-applicant',
        'GREEN',
      );
      const signature = SumsubMockHelper.generateWebhookSignature(
        payload,
        'test-webhook-secret',
      );

      // Act - Should succeed but not update anything
      await request(app.getHttpServer())
        .post('/api/v1/webhooks/sumsub')
        .set('X-Payload-Digest', signature)
        .send(payload)
        .expect(200);
    });

    it('should process applicantPending webhook', async () => {
      // Arrange
      const { verificationId, applicantId } = await createVerification('pending-user');

      const payload = SumsubMockHelper.createWebhookPayload(applicantId);
      payload.type = 'applicantPending';
      payload.reviewStatus = 'pending';

      const signature = SumsubMockHelper.generateWebhookSignature(
        payload,
        'test-webhook-secret',
      );

      // Act
      await request(app.getHttpServer())
        .post('/api/v1/webhooks/sumsub')
        .set('X-Payload-Digest', signature)
        .send(payload)
        .expect(200);

      // Assert - Status should be updated to IN_REVIEW
      const statusResponse = await request(app.getHttpServer())
        .get(`/api/v1/verifications/${verificationId}`)
        .expect(200);

      expect(statusResponse.body.status).toBe('in_review');
    });
  });

  describe('Resubmission Flow', () => {
    it('should allow resubmission after RETRY rejection', async () => {
      // Step 1: Create verification
      const { verificationId, applicantId } = await createVerification('resubmit-user');

      // Step 2: Set to pending
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

      // Step 3: Reject with RETRY
      const rejectPayload = SumsubMockHelper.createWebhookPayload(
        applicantId,
        'RED',
        'RETRY',
      );
      const rejectSignature = SumsubMockHelper.generateWebhookSignature(
        rejectPayload,
        'test-webhook-secret',
      );

      await request(app.getHttpServer())
        .post('/api/v1/webhooks/sumsub')
        .set('X-Payload-Digest', rejectSignature)
        .send(rejectPayload)
        .expect(200);

      // Step 4: Resubmit
      SumsubMockHelper.mockResetApplicant(applicantId);
      SumsubMockHelper.mockGenerateAccessToken('act-resubmit-token');

      const resubmitResponse = await request(app.getHttpServer())
        .post(`/api/v1/verifications/${verificationId}/resubmit`)
        .expect(200);

      expect(resubmitResponse.body.accessToken).toBe('act-resubmit-token');

      // Step 5: Check status is back to pending
      const statusResponse = await request(app.getHttpServer())
        .get(`/api/v1/verifications/${verificationId}`)
        .expect(200);

      expect(statusResponse.body.status).toBe('pending');

      // Step 6: Approve on second attempt
      const approvePayload = SumsubMockHelper.createWebhookPayload(
        applicantId,
        'GREEN',
      );
      const approveSignature = SumsubMockHelper.generateWebhookSignature(
        approvePayload,
        'test-webhook-secret',
      );

      await request(app.getHttpServer())
        .post('/api/v1/webhooks/sumsub')
        .set('X-Payload-Digest', approveSignature)
        .send(approvePayload)
        .expect(200);

      // Step 7: Verify final approval
      const finalStatusResponse = await request(app.getHttpServer())
        .get(`/api/v1/verifications/${verificationId}`)
        .expect(200);

      expect(finalStatusResponse.body.status).toBe('approved');
    });
  });
});
