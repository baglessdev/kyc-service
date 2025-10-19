import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { VerificationService } from '../verification.service';
import { ApplicantRepository } from '../../applicant/repositories/applicant.repository';
import { VerificationRepository } from '../repositories/verification.repository';
import { SumsubService } from '../../sumsub/sumsub.service';
import { VerificationStatus } from '../../../common/enums';
import {
  mockApplicant,
  mockVerification,
  mockSumsubApplicant,
  mockAccessToken,
  createMockRepository,
  createMockSumsubService,
} from './test-helpers';

describe('VerificationService', () => {
  let service: VerificationService;
  let applicantRepository: jest.Mocked<ApplicantRepository>;
  let verificationRepository: jest.Mocked<VerificationRepository>;
  let sumsubService: jest.Mocked<SumsubService>;

  beforeEach(async () => {
    const mockApplicantRepo = createMockRepository();
    const mockVerificationRepo = createMockRepository();
    const mockSumsub = createMockSumsubService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationService,
        {
          provide: ApplicantRepository,
          useValue: mockApplicantRepo,
        },
        {
          provide: VerificationRepository,
          useValue: mockVerificationRepo,
        },
        {
          provide: SumsubService,
          useValue: mockSumsub,
        },
      ],
    }).compile();

    service = module.get<VerificationService>(VerificationService);
    applicantRepository = module.get(ApplicantRepository);
    verificationRepository = module.get(VerificationRepository);
    sumsubService = module.get(SumsubService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initiateVerification', () => {
    const validDto = {
      userId: 'test-user-123',
      email: 'test@example.com',
      phone: '+1234567890',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      country: 'USA',
    };

    it('should successfully initiate verification for new applicant', async () => {
      // Arrange
      verificationRepository.findActiveByUserId.mockResolvedValue(null);
      applicantRepository.findByUserId.mockResolvedValue(null);
      applicantRepository.create.mockResolvedValue(mockApplicant as any);
      sumsubService.createApplicant.mockResolvedValue(mockSumsubApplicant);
      sumsubService.generateAccessToken.mockResolvedValue(mockAccessToken);
      applicantRepository.updateExternalApplicantId.mockResolvedValue(
        mockApplicant as any,
      );
      verificationRepository.create.mockResolvedValue(mockVerification as any);

      // Act
      const result = await service.initiateVerification(validDto);

      // Assert
      expect(result).toHaveProperty('verificationId');
      expect(result).toHaveProperty('applicantId');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('expiresAt');
      expect(result.accessToken).toBe(mockAccessToken.token);

      expect(applicantRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: validDto.userId,
          email: validDto.email,
        }),
      );
      expect(sumsubService.createApplicant).toHaveBeenCalled();
      expect(sumsubService.generateAccessToken).toHaveBeenCalled();
      expect(verificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: validDto.userId,
          status: VerificationStatus.INITIATED,
        }),
      );
    });

    it('should use existing applicant if found', async () => {
      // Arrange
      verificationRepository.findActiveByUserId.mockResolvedValue(null);
      applicantRepository.findByUserId.mockResolvedValue(mockApplicant as any);
      sumsubService.createApplicant.mockResolvedValue(mockSumsubApplicant);
      sumsubService.generateAccessToken.mockResolvedValue(mockAccessToken);
      applicantRepository.updateExternalApplicantId.mockResolvedValue(
        mockApplicant as any,
      );
      verificationRepository.create.mockResolvedValue(mockVerification as any);

      // Act
      await service.initiateVerification(validDto);

      // Assert
      expect(applicantRepository.create).not.toHaveBeenCalled();
      expect(applicantRepository.findByUserId).toHaveBeenCalledWith(validDto.userId);
    });

    it('should throw error if user has active verification', async () => {
      // Arrange
      const activeVerification = {
        ...mockVerification,
        status: VerificationStatus.PENDING,
      };
      verificationRepository.findActiveByUserId.mockResolvedValue(
        activeVerification as any,
      );

      // Act & Assert
      await expect(service.initiateVerification(validDto)).rejects.toThrow(
        HttpException,
      );
      await expect(service.initiateVerification(validDto)).rejects.toThrow(
        'User already has an active verification in progress',
      );

      expect(applicantRepository.create).not.toHaveBeenCalled();
      expect(sumsubService.createApplicant).not.toHaveBeenCalled();
    });

    it('should use default level name if not provided', async () => {
      // Arrange
      const dtoWithoutLevel = { ...validDto, levelName: undefined };
      verificationRepository.findActiveByUserId.mockResolvedValue(null);
      applicantRepository.findByUserId.mockResolvedValue(mockApplicant as any);
      sumsubService.createApplicant.mockResolvedValue(mockSumsubApplicant);
      sumsubService.generateAccessToken.mockResolvedValue(mockAccessToken);
      applicantRepository.updateExternalApplicantId.mockResolvedValue(
        mockApplicant as any,
      );
      verificationRepository.create.mockResolvedValue(mockVerification as any);

      // Act
      await service.initiateVerification(dtoWithoutLevel);

      // Assert
      expect(sumsubService.createApplicant).toHaveBeenCalledWith(
        expect.any(Object),
        'basic-kyc-level',
      );
    });
  });

  describe('getVerificationStatus', () => {
    it('should return verification status if found', async () => {
      // Arrange
      verificationRepository.findByVerificationId.mockResolvedValue(
        mockVerification as any,
      );

      // Act
      const result = await service.getVerificationStatus('ver_test123');

      // Assert
      expect(result).toBeDefined();
      expect(result.verificationId).toBe(mockVerification.verificationId);
      expect(result.status).toBe(mockVerification.status);
      expect(verificationRepository.findByVerificationId).toHaveBeenCalledWith(
        'ver_test123',
      );
    });

    it('should throw 404 if verification not found', async () => {
      // Arrange
      verificationRepository.findByVerificationId.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getVerificationStatus('non-existent'),
      ).rejects.toThrow(HttpException);
      await expect(
        service.getVerificationStatus('non-existent'),
      ).rejects.toThrow('Verification not found');
    });
  });

  describe('getUserVerifications', () => {
    it('should return array of user verifications', async () => {
      // Arrange
      const verifications = [mockVerification, { ...mockVerification, _id: 'another-id' }];
      verificationRepository.findByUserId.mockResolvedValue(verifications as any);

      // Act
      const result = await service.getUserVerifications('test-user-123');

      // Assert
      expect(result).toHaveLength(2);
      expect(verificationRepository.findByUserId).toHaveBeenCalledWith(
        'test-user-123',
      );
    });

    it('should return empty array if no verifications found', async () => {
      // Arrange
      verificationRepository.findByUserId.mockResolvedValue([]);

      // Act
      const result = await service.getUserVerifications('test-user-123');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('refreshAccessToken', () => {
    it('should successfully refresh token for active verification', async () => {
      // Arrange
      const pendingVerification = {
        ...mockVerification,
        status: VerificationStatus.PENDING,
      };
      verificationRepository.findByVerificationId.mockResolvedValue(
        pendingVerification as any,
      );
      sumsubService.generateAccessToken.mockResolvedValue(mockAccessToken);
      verificationRepository.updateAccessToken.mockResolvedValue(undefined);

      // Act
      const result = await service.refreshAccessToken('ver_test123');

      // Assert
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('expiresAt');
      expect(result.accessToken).toBe(mockAccessToken.token);
      expect(sumsubService.generateAccessToken).toHaveBeenCalled();
      expect(verificationRepository.updateAccessToken).toHaveBeenCalled();
    });

    it('should throw 404 if verification not found', async () => {
      // Arrange
      verificationRepository.findByVerificationId.mockResolvedValue(null);

      // Act & Assert
      await expect(service.refreshAccessToken('ver_test123')).rejects.toThrow(
        'Verification not found',
      );
    });

    it('should throw error for completed verification', async () => {
      // Arrange
      const approvedVerification = {
        ...mockVerification,
        status: VerificationStatus.APPROVED,
      };
      verificationRepository.findByVerificationId.mockResolvedValue(
        approvedVerification as any,
      );

      // Act & Assert
      await expect(service.refreshAccessToken('ver_test123')).rejects.toThrow(
        'Cannot refresh token for completed verification',
      );
    });
  });

  describe('resubmitVerification', () => {
    it('should successfully resubmit verification in RESUBMIT_REQUIRED status', async () => {
      // Arrange
      const resubmitVerification = {
        ...mockVerification,
        status: VerificationStatus.RESUBMIT_REQUIRED,
        externalApplicantId: 'sumsub-123',
      };
      verificationRepository.findByVerificationId.mockResolvedValue(
        resubmitVerification as any,
      );
      sumsubService.resetApplicant.mockResolvedValue(undefined);
      verificationRepository.updateStatus.mockResolvedValue(mockVerification as any);
      sumsubService.generateAccessToken.mockResolvedValue(mockAccessToken);
      verificationRepository.updateAccessToken.mockResolvedValue(undefined);

      // Act
      const result = await service.resubmitVerification('ver_test123');

      // Assert
      expect(result).toHaveProperty('accessToken');
      expect(sumsubService.resetApplicant).toHaveBeenCalledWith('sumsub-123');
      expect(verificationRepository.updateStatus).toHaveBeenCalledWith(
        'ver_test123',
        VerificationStatus.PENDING,
      );
    });

    it('should throw error if verification not in RESUBMIT_REQUIRED status', async () => {
      // Arrange
      const approvedVerification = {
        ...mockVerification,
        status: VerificationStatus.APPROVED,
      };
      verificationRepository.findByVerificationId.mockResolvedValue(
        approvedVerification as any,
      );

      // Act & Assert
      await expect(service.resubmitVerification('ver_test123')).rejects.toThrow(
        'Verification is not in resubmit required state',
      );
    });

    it('should throw 404 if verification not found', async () => {
      // Arrange
      verificationRepository.findByVerificationId.mockResolvedValue(null);

      // Act & Assert
      await expect(service.resubmitVerification('ver_test123')).rejects.toThrow(
        'Verification not found',
      );
    });
  });
});
