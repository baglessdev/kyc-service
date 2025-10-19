import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { VerificationController } from '../verification.controller';
import { VerificationService } from '../verification.service';
import { VerificationStatus } from '../../../common/enums';
import {
  mockVerification,
  mockAccessToken,
} from './test-helpers';

describe('VerificationController', () => {
  let controller: VerificationController;
  let service: jest.Mocked<VerificationService>;

  const mockVerificationService = {
    initiateVerification: jest.fn(),
    getVerificationStatus: jest.fn(),
    getUserVerifications: jest.fn(),
    refreshAccessToken: jest.fn(),
    resubmitVerification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VerificationController],
      providers: [
        {
          provide: VerificationService,
          useValue: mockVerificationService,
        },
      ],
    }).compile();

    controller = module.get<VerificationController>(VerificationController);
    service = module.get(VerificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /api/v1/verifications/initiate', () => {
    const validDto = {
      userId: 'test-user-123',
      email: 'test@example.com',
      phone: '+1234567890',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      country: 'USA',
    };

    const mockResponse = {
      verificationId: 'ver_test123',
      applicantId: 'app_123',
      accessToken: 'act-token-123',
      expiresAt: new Date(),
    };

    it('should successfully initiate verification', async () => {
      // Arrange
      service.initiateVerification.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.initiateVerification(validDto);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(service.initiateVerification).toHaveBeenCalledWith(validDto);
      expect(service.initiateVerification).toHaveBeenCalledTimes(1);
    });

    it('should throw error when user already has active verification', async () => {
      // Arrange
      service.initiateVerification.mockRejectedValue(
        new HttpException(
          'User already has an active verification in progress',
          HttpStatus.CONFLICT,
        ),
      );

      // Act & Assert
      await expect(controller.initiateVerification(validDto)).rejects.toThrow(
        HttpException,
      );
      expect(service.initiateVerification).toHaveBeenCalledWith(validDto);
    });
  });

  describe('GET /api/v1/verifications/:verificationId', () => {
    it('should return verification status', async () => {
      // Arrange
      service.getVerificationStatus.mockResolvedValue(mockVerification as any);

      // Act
      const result = await controller.getVerificationStatus('ver_test123');

      // Assert
      expect(result).toEqual(mockVerification);
      expect(service.getVerificationStatus).toHaveBeenCalledWith('ver_test123');
    });

    it('should throw 404 when verification not found', async () => {
      // Arrange
      service.getVerificationStatus.mockRejectedValue(
        new HttpException('Verification not found', HttpStatus.NOT_FOUND),
      );

      // Act & Assert
      await expect(
        controller.getVerificationStatus('non-existent'),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('GET /api/v1/verifications/user/:userId', () => {
    it('should return user verifications', async () => {
      // Arrange
      const verifications = [mockVerification, mockVerification];
      service.getUserVerifications.mockResolvedValue(verifications as any);

      // Act
      const result = await controller.getUserVerifications('test-user-123');

      // Assert
      expect(result).toEqual(verifications);
      expect(service.getUserVerifications).toHaveBeenCalledWith('test-user-123');
    });

    it('should return empty array when no verifications found', async () => {
      // Arrange
      service.getUserVerifications.mockResolvedValue([]);

      // Act
      const result = await controller.getUserVerifications('test-user-123');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('POST /api/v1/verifications/:verificationId/refresh-token', () => {
    const mockTokenResponse = {
      accessToken: mockAccessToken.token,
      expiresAt: new Date(),
    };

    it('should successfully refresh access token', async () => {
      // Arrange
      service.refreshAccessToken.mockResolvedValue(mockTokenResponse);

      // Act
      const result = await controller.refreshAccessToken('ver_test123');

      // Assert
      expect(result).toEqual(mockTokenResponse);
      expect(service.refreshAccessToken).toHaveBeenCalledWith('ver_test123');
    });

    it('should throw error for completed verification', async () => {
      // Arrange
      service.refreshAccessToken.mockRejectedValue(
        new HttpException(
          'Cannot refresh token for completed verification',
          HttpStatus.BAD_REQUEST,
        ),
      );

      // Act & Assert
      await expect(controller.refreshAccessToken('ver_test123')).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('POST /api/v1/verifications/:verificationId/resubmit', () => {
    const mockTokenResponse = {
      accessToken: mockAccessToken.token,
      expiresAt: new Date(),
    };

    it('should successfully resubmit verification', async () => {
      // Arrange
      service.resubmitVerification.mockResolvedValue(mockTokenResponse);

      // Act
      const result = await controller.resubmitVerification('ver_test123');

      // Assert
      expect(result).toEqual(mockTokenResponse);
      expect(service.resubmitVerification).toHaveBeenCalledWith('ver_test123');
    });

    it('should throw error when verification not in RESUBMIT_REQUIRED status', async () => {
      // Arrange
      service.resubmitVerification.mockRejectedValue(
        new HttpException(
          'Verification is not in resubmit required state',
          HttpStatus.BAD_REQUEST,
        ),
      );

      // Act & Assert
      await expect(
        controller.resubmitVerification('ver_test123'),
      ).rejects.toThrow(HttpException);
    });
  });
});
