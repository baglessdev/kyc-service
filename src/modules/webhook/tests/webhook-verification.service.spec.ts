import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { WebhookVerificationService } from '../webhook-verification.service';
import * as crypto from 'crypto';

describe('WebhookVerificationService', () => {
  let service: WebhookVerificationService;
  const mockWebhookSecret = 'test-webhook-secret-key';

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'SUMSUB_WEBHOOK_SECRET') {
          return mockWebhookSecret;
        }
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookVerificationService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<WebhookVerificationService>(WebhookVerificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifySignature', () => {
    it('should verify valid signature successfully', () => {
      // Arrange
      const payload = JSON.stringify({
        applicantId: 'test123',
        type: 'applicantReviewed',
      });

      const validSignature = crypto
        .createHmac('sha256', mockWebhookSecret)
        .update(payload)
        .digest('hex');

      // Act & Assert
      expect(() => {
        service.verifySignature(payload, validSignature);
      }).not.toThrow();
    });

    it('should throw UnauthorizedException for invalid signature', () => {
      // Arrange
      const payload = JSON.stringify({
        applicantId: 'test123',
        type: 'applicantReviewed',
      });
      const invalidSignature = 'invalid-signature-hash';

      // Act & Assert
      expect(() => {
        service.verifySignature(payload, invalidSignature);
      }).toThrow(UnauthorizedException);

      expect(() => {
        service.verifySignature(payload, invalidSignature);
      }).toThrow('Invalid webhook signature');
    });

    it('should throw UnauthorizedException when signature is missing', () => {
      // Arrange
      const payload = JSON.stringify({ test: 'data' });

      // Act & Assert
      expect(() => {
        service.verifySignature(payload, '');
      }).toThrow(UnauthorizedException);

      expect(() => {
        service.verifySignature(payload, '');
      }).toThrow('Webhook signature missing');
    });

    it('should reject tampered payload', () => {
      // Arrange
      const originalPayload = JSON.stringify({
        applicantId: 'test123',
        reviewAnswer: 'GREEN',
      });

      const validSignature = crypto
        .createHmac('sha256', mockWebhookSecret)
        .update(originalPayload)
        .digest('hex');

      // Tamper with payload
      const tamperedPayload = JSON.stringify({
        applicantId: 'test123',
        reviewAnswer: 'RED', // Changed
      });

      // Act & Assert
      expect(() => {
        service.verifySignature(tamperedPayload, validSignature);
      }).toThrow(UnauthorizedException);
    });
  });

  describe('verifySignature with no secret configured', () => {
    let serviceWithoutSecret: WebhookVerificationService;

    beforeEach(async () => {
      const mockConfigService = {
        get: jest.fn(() => ''), // No secret configured
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WebhookVerificationService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      serviceWithoutSecret = module.get<WebhookVerificationService>(
        WebhookVerificationService,
      );
    });

    it('should skip verification when no secret is configured', () => {
      // Arrange
      const payload = JSON.stringify({ test: 'data' });
      const anySignature = 'any-signature';

      // Act & Assert
      expect(() => {
        serviceWithoutSecret.verifySignature(payload, anySignature);
      }).not.toThrow();
    });
  });
});
