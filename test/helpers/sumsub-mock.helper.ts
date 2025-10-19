import nock from 'nock';
import * as crypto from 'crypto';

/**
 * Helper to mock Sumsub API calls
 * Since we don't have real Sumsub keys, all interactions are mocked
 */
export class SumsubMockHelper {
  private static readonly SUMSUB_BASE_URL = 'https://api.sumsub.com';

  /**
   * Mock successful applicant creation
   */
  static mockCreateApplicant(applicantId: string = 'test-applicant-123') {
    return nock(this.SUMSUB_BASE_URL)
      .post('/resources/applicants')
      .query(true)
      .reply(200, {
        id: applicantId,
        createdAt: new Date().toISOString(),
        key: 'APPLICANT_KEY',
        clientId: 'client-123',
        inspectionId: 'inspection-123',
        externalUserId: 'test-user-123',
        info: {
          firstName: 'John',
          lastName: 'Doe',
          dob: '1990-01-01',
          country: 'USA',
        },
        email: 'test@example.com',
      });
  }

  /**
   * Mock successful access token generation
   */
  static mockGenerateAccessToken(token: string = 'act-test-token-123') {
    return nock(this.SUMSUB_BASE_URL)
      .post('/resources/accessTokens')
      .query(true)
      .reply(200, {
        token,
        userId: 'test-user-123',
      });
  }

  /**
   * Mock applicant status check
   */
  static mockGetApplicantStatus(
    applicantId: string,
    reviewAnswer: 'GREEN' | 'RED' = 'GREEN',
  ) {
    return nock(this.SUMSUB_BASE_URL)
      .get(`/resources/applicants/${applicantId}/status`)
      .query(true)
      .reply(200, {
        id: applicantId,
        reviewStatus: 'completed',
        reviewResult: {
          reviewAnswer,
          rejectLabels: reviewAnswer === 'RED' ? ['DOCUMENT_MISSING'] : [],
          rejectType: reviewAnswer === 'RED' ? 'RETRY' : undefined,
        },
      });
  }

  /**
   * Mock applicant reset
   */
  static mockResetApplicant(applicantId: string) {
    return nock(this.SUMSUB_BASE_URL)
      .post(`/resources/applicants/${applicantId}/reset`)
      .query(true)
      .reply(200, {
        ok: 1,
      });
  }

  /**
   * Mock all Sumsub API calls for a complete flow
   */
  static mockCompleteFlow(applicantId: string = 'test-applicant-123') {
    this.mockCreateApplicant(applicantId);
    this.mockGenerateAccessToken();
    return applicantId;
  }

  /**
   * Generate webhook signature (mock version - doesn't need real secret)
   */
  static generateWebhookSignature(payload: any, secret: string = 'test-secret'): string {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  /**
   * Create mock webhook payload
   */
  static createWebhookPayload(
    applicantId: string,
    reviewAnswer: 'GREEN' | 'RED' = 'GREEN',
    rejectType?: 'RETRY' | 'FINAL',
  ) {
    return {
      applicantId,
      inspectionId: 'inspection-123',
      applicantType: 'individual',
      correlationId: 'corr-123',
      levelName: 'basic-kyc-level',
      externalUserId: 'test-user-123',
      type: 'applicantReviewed',
      reviewStatus: 'completed',
      createdAt: new Date().toISOString(),
      reviewResult: {
        reviewAnswer,
        rejectLabels: reviewAnswer === 'RED' ? ['DOCUMENT_MISSING'] : [],
        rejectType,
        moderationComment: reviewAnswer === 'GREEN' ? 'All checks passed' : 'Document issue',
      },
    };
  }

  /**
   * Clean all nock mocks
   */
  static cleanAll() {
    nock.cleanAll();
  }

  /**
   * Verify all mocked requests were called
   */
  static verifyAll() {
    if (!nock.isDone()) {
      throw new Error('Not all nock interceptors were used');
    }
  }
}
