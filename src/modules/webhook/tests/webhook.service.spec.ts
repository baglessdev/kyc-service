import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WebhookService } from '../webhook.service';
import { VerificationRepository } from '../../verification/repositories/verification.repository';
import { VerificationStateService } from '../../verification/verification-state.service';
import { WebhookEvent } from '../schemas/webhook-event.schema';
import {
  WebhookEventType,
  ReviewStatus,
} from '../interfaces/webhook-payload.interface';
import { VerificationStatus, ReviewAnswer, RejectType } from '../../../common/enums';

describe('WebhookService', () => {
  let service: WebhookService;
  let webhookEventModel: jest.Mocked<Model<WebhookEvent>>;
  let verificationRepository: jest.Mocked<VerificationRepository>;
  let verificationStateService: jest.Mocked<VerificationStateService>;

  const mockVerification = {
    verificationId: 'ver_test123',
    userId: 'user_123',
    status: VerificationStatus.IN_REVIEW,
    externalApplicantId: 'sumsub_123',
  };

  const mockWebhookPayload = {
    applicantId: 'sumsub_123',
    inspectionId: 'inspection_123',
    applicantType: 'individual',
    correlationId: 'corr_123',
    levelName: 'basic-kyc-level',
    externalUserId: 'user_123',
    type: WebhookEventType.APPLICANT_REVIEWED,
    reviewStatus: ReviewStatus.COMPLETED,
    createdAt: new Date().toISOString(),
    reviewResult: {
      reviewAnswer: ReviewAnswer.GREEN,
      rejectLabels: [],
      moderationComment: 'Approved',
    },
  };

  beforeEach(async () => {
    const saveMock = jest.fn().mockResolvedValue({});

    const mockWebhookModel = jest.fn().mockImplementation(() => ({
      save: saveMock,
    }));

    const mockVerificationRepo = {
      findByExternalApplicantId: jest.fn(),
      findByVerificationId: jest.fn(),
      updateStatus: jest.fn(),
    };

    const mockStateService = {
      getStatusFromReviewResult: jest.fn(),
      validateTransition: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        {
          provide: getModelToken(WebhookEvent.name),
          useValue: mockWebhookModel,
        },
        {
          provide: VerificationRepository,
          useValue: mockVerificationRepo,
        },
        {
          provide: VerificationStateService,
          useValue: mockStateService,
        },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    webhookEventModel = module.get(getModelToken(WebhookEvent.name));
    verificationRepository = module.get(VerificationRepository);
    verificationStateService = module.get(VerificationStateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processWebhook', () => {
    it('should process applicant reviewed webhook successfully', async () => {
      // Arrange
      verificationRepository.findByExternalApplicantId.mockResolvedValue(
        mockVerification as any,
      );
      verificationRepository.findByVerificationId.mockResolvedValue(
        mockVerification as any,
      );
      verificationStateService.getStatusFromReviewResult.mockReturnValue(
        VerificationStatus.APPROVED,
      );
      verificationStateService.validateTransition.mockReturnValue(undefined);
      verificationRepository.updateStatus.mockResolvedValue(mockVerification as any);

      // Act
      await service.processWebhook(mockWebhookPayload);

      // Assert
      expect(verificationRepository.findByExternalApplicantId).toHaveBeenCalledWith(
        'sumsub_123',
      );
      expect(verificationStateService.getStatusFromReviewResult).toHaveBeenCalledWith(
        ReviewAnswer.GREEN,
        undefined,
      );
      expect(verificationRepository.updateStatus).toHaveBeenCalledWith(
        'ver_test123',
        VerificationStatus.APPROVED,
        expect.objectContaining({
          reviewResult: expect.any(Object),
          reviewedAt: expect.any(Date),
          inspectionId: 'inspection_123',
        }),
      );
    });

    it('should handle verification not found gracefully', async () => {
      // Arrange
      verificationRepository.findByExternalApplicantId.mockResolvedValue(null);

      // Act
      await service.processWebhook(mockWebhookPayload);

      // Assert
      expect(verificationRepository.findByExternalApplicantId).toHaveBeenCalled();
      expect(verificationRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should process applicant pending webhook', async () => {
      // Arrange
      const pendingPayload = {
        ...mockWebhookPayload,
        type: WebhookEventType.APPLICANT_PENDING,
        reviewStatus: ReviewStatus.PENDING,
      };

      const pendingVerification = {
        ...mockVerification,
        status: VerificationStatus.PENDING,
      };

      verificationRepository.findByExternalApplicantId.mockResolvedValue(
        pendingVerification as any,
      );
      verificationRepository.findByVerificationId.mockResolvedValue(
        pendingVerification as any,
      );
      verificationRepository.updateStatus.mockResolvedValue(pendingVerification as any);

      // Act
      await service.processWebhook(pendingPayload);

      // Assert
      expect(verificationRepository.updateStatus).toHaveBeenCalledWith(
        'ver_test123',
        VerificationStatus.IN_REVIEW,
        expect.objectContaining({
          submittedAt: expect.any(Date),
        }),
      );
    });

    it('should handle rejected with retry webhook', async () => {
      // Arrange
      const rejectPayload = {
        ...mockWebhookPayload,
        reviewResult: {
          reviewAnswer: ReviewAnswer.RED,
          rejectType: RejectType.RETRY,
          rejectLabels: ['DOCUMENT_MISSING'],
          moderationComment: 'Please resubmit',
        },
      };

      verificationRepository.findByExternalApplicantId.mockResolvedValue(
        mockVerification as any,
      );
      verificationRepository.findByVerificationId.mockResolvedValue(
        mockVerification as any,
      );
      verificationStateService.getStatusFromReviewResult.mockReturnValue(
        VerificationStatus.RESUBMIT_REQUIRED,
      );
      verificationStateService.validateTransition.mockReturnValue(undefined);
      verificationRepository.updateStatus.mockResolvedValue(mockVerification as any);

      // Act
      await service.processWebhook(rejectPayload);

      // Assert
      expect(verificationStateService.getStatusFromReviewResult).toHaveBeenCalledWith(
        ReviewAnswer.RED,
        RejectType.RETRY,
      );
      expect(verificationRepository.updateStatus).toHaveBeenCalledWith(
        'ver_test123',
        VerificationStatus.RESUBMIT_REQUIRED,
        expect.any(Object),
      );
    });

    it('should handle final rejection webhook', async () => {
      // Arrange
      const rejectPayload = {
        ...mockWebhookPayload,
        reviewResult: {
          reviewAnswer: ReviewAnswer.RED,
          rejectType: RejectType.FINAL,
          rejectLabels: ['FRAUDULENT_DOCUMENT'],
          moderationComment: 'Fraudulent document detected',
        },
      };

      verificationRepository.findByExternalApplicantId.mockResolvedValue(
        mockVerification as any,
      );
      verificationRepository.findByVerificationId.mockResolvedValue(
        mockVerification as any,
      );
      verificationStateService.getStatusFromReviewResult.mockReturnValue(
        VerificationStatus.REJECTED,
      );
      verificationStateService.validateTransition.mockReturnValue(undefined);
      verificationRepository.updateStatus.mockResolvedValue(mockVerification as any);

      // Act
      await service.processWebhook(rejectPayload);

      // Assert
      expect(verificationRepository.updateStatus).toHaveBeenCalledWith(
        'ver_test123',
        VerificationStatus.REJECTED,
        expect.any(Object),
      );
    });
  });
});
