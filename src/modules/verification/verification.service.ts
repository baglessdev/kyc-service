import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Types } from 'mongoose';
import { ApplicantRepository } from '../applicant/repositories/applicant.repository';
import { VerificationRepository } from './repositories/verification.repository';
import { SumsubService } from '../sumsub/sumsub.service';
import { Logger } from '../../common/utils/logger';
import { IdGenerator } from '../../common/utils/id-generator';
import { VerificationStatus } from '../../common/enums';
import {
  InitiateVerificationDto,
  InitiateVerificationResponseDto,
  VerificationResponseDto,
} from './dto';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private readonly DEFAULT_LEVEL = 'basic-kyc-level';
  private readonly TOKEN_TTL = 3600; // 1 hour

  constructor(
    private applicantRepository: ApplicantRepository,
    private verificationRepository: VerificationRepository,
    private sumsubService: SumsubService,
  ) {}

  /**
   * Initiate KYC verification process
   */
  async initiateVerification(
    dto: InitiateVerificationDto,
  ): Promise<InitiateVerificationResponseDto> {
    this.logger.log(`Initiating verification for user: ${dto.userId}`);

    // Check if user has active verification
    const activeVerification =
      await this.verificationRepository.findActiveByUserId(dto.userId);
    if (activeVerification) {
      throw new HttpException(
        'User already has an active verification in progress',
        HttpStatus.CONFLICT,
      );
    }

    // Find or create applicant
    let applicant = await this.applicantRepository.findByUserId(dto.userId);

    if (!applicant) {
      // Create new applicant in our database
      applicant = await this.applicantRepository.create({
        userId: dto.userId,
        email: dto.email,
        phone: dto.phone,
        personalInfo: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          country: dto.country,
          nationality: dto.nationality,
        },
      });
      this.logger.log(`Created new applicant for user: ${dto.userId}`);
    }

    // Create applicant in Sumsub
    const levelName = dto.levelName || this.DEFAULT_LEVEL;
    const sumsubApplicant = await this.sumsubService.createApplicant(
      {
        externalUserId: dto.userId,
        email: dto.email,
        phone: dto.phone,
        fixedInfo: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          dob: dto.dateOfBirth,
          country: dto.country,
          nationality: dto.nationality,
        },
      },
      levelName,
    );

    // Update applicant with Sumsub ID
    await this.applicantRepository.updateExternalApplicantId(
      dto.userId,
      sumsubApplicant.id,
    );

    // Generate access token for WebSDK
    const tokenResponse = await this.sumsubService.generateAccessToken(
      dto.userId,
      levelName,
      this.TOKEN_TTL,
    );

    // Create verification record
    const verificationId = IdGenerator.generateVerificationId();
    const verification = await this.verificationRepository.create({
      verificationId,
      applicantId: applicant._id as Types.ObjectId,
      userId: dto.userId,
      levelName,
      status: VerificationStatus.INITIATED,
      externalApplicantId: sumsubApplicant.id,
      currentAccessToken: {
        tokenHash: this.hashToken(tokenResponse.token),
        expiresAt: new Date(Date.now() + this.TOKEN_TTL * 1000),
        createdAt: new Date(),
      },
    });

    this.logger.log(
      `Verification initiated: ${verificationId} for user: ${dto.userId}`,
    );

    return {
      verificationId: verification.verificationId,
      applicantId: sumsubApplicant.id,
      accessToken: tokenResponse.token,
      expiresAt: new Date(Date.now() + this.TOKEN_TTL * 1000),
    };
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(
    verificationId: string,
  ): Promise<VerificationResponseDto> {
    const verification =
      await this.verificationRepository.findByVerificationId(verificationId);

    if (!verification) {
      throw new HttpException('Verification not found', HttpStatus.NOT_FOUND);
    }

    return this.mapToResponseDto(verification);
  }

  /**
   * Get user's verification history
   */
  async getUserVerifications(userId: string): Promise<VerificationResponseDto[]> {
    const verifications =
      await this.verificationRepository.findByUserId(userId);
    return verifications.map((v) => this.mapToResponseDto(v));
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(
    verificationId: string,
  ): Promise<{ accessToken: string; expiresAt: Date }> {
    const verification =
      await this.verificationRepository.findByVerificationId(verificationId);

    if (!verification) {
      throw new HttpException('Verification not found', HttpStatus.NOT_FOUND);
    }

    if (
      verification.status === VerificationStatus.APPROVED ||
      verification.status === VerificationStatus.REJECTED
    ) {
      throw new HttpException(
        'Cannot refresh token for completed verification',
        HttpStatus.BAD_REQUEST,
      );
    }

    const tokenResponse = await this.sumsubService.generateAccessToken(
      verification.userId,
      verification.levelName,
      this.TOKEN_TTL,
    );

    const expiresAt = new Date(Date.now() + this.TOKEN_TTL * 1000);

    await this.verificationRepository.updateAccessToken(
      verificationId,
      this.hashToken(tokenResponse.token),
      expiresAt,
    );

    this.logger.log(`Access token refreshed for verification: ${verificationId}`);

    return {
      accessToken: tokenResponse.token,
      expiresAt,
    };
  }

  /**
   * Resubmit verification (for RETRY cases)
   */
  async resubmitVerification(
    verificationId: string,
  ): Promise<{ accessToken: string; expiresAt: Date }> {
    const verification =
      await this.verificationRepository.findByVerificationId(verificationId);

    if (!verification) {
      throw new HttpException('Verification not found', HttpStatus.NOT_FOUND);
    }

    if (verification.status !== VerificationStatus.RESUBMIT_REQUIRED) {
      throw new HttpException(
        'Verification is not in resubmit required state',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Reset applicant in Sumsub
    if (verification.externalApplicantId) {
      await this.sumsubService.resetApplicant(verification.externalApplicantId);
    }

    // Update status to pending
    await this.verificationRepository.updateStatus(
      verificationId,
      VerificationStatus.PENDING,
    );

    // Generate new access token
    return this.refreshAccessToken(verificationId);
  }

  /**
   * Map verification document to response DTO
   */
  private mapToResponseDto(verification: any): VerificationResponseDto {
    return {
      verificationId: verification.verificationId,
      applicantId: verification.externalApplicantId || '',
      userId: verification.userId,
      status: verification.status,
      levelName: verification.levelName,
      externalApplicantId: verification.externalApplicantId,
      reviewResult: verification.reviewResult,
      createdAt: verification.createdAt,
      updatedAt: verification.updatedAt,
      submittedAt: verification.submittedAt,
      reviewedAt: verification.reviewedAt,
      approvedAt: verification.approvedAt,
      rejectedAt: verification.rejectedAt,
    };
  }

  /**
   * Simple token hashing (for storage)
   */
  private hashToken(token: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
