import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpStatus,
  HttpCode,
  HttpException,
} from '@nestjs/common';
import { VerificationService } from './verification.service';
import { InitiateVerificationDto } from './dto/initiate-verification.dto';
import { InitiateVerificationResponseDto } from './dto/initiate-verification-response.dto';
import { AccessTokenResponseDto } from './dto/access-token-response.dto';
import { Logger } from '../../common/utils/logger';

@Controller('api/v1/verifications')
export class VerificationController {
  private readonly logger = new Logger(VerificationController.name);

  constructor(private readonly verificationService: VerificationService) {}

  /**
   * Initiate a new KYC verification process
   * POST /api/v1/verifications/initiate
   */
  @Post('initiate')
  @HttpCode(HttpStatus.CREATED)
  async initiateVerification(
    @Body() dto: InitiateVerificationDto,
  ): Promise<InitiateVerificationResponseDto> {
    this.logger.log(`Initiating verification for user: ${dto.userId}`);

    try {
      const result = await this.verificationService.initiateVerification(dto);
      this.logger.log(
        `Verification initiated successfully: ${result.verificationId}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to initiate verification for user ${dto.userId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get verification status by verification ID
   * GET /api/v1/verifications/:verificationId
   */
  @Get(':verificationId')
  @HttpCode(HttpStatus.OK)
  async getVerificationStatus(
    @Param('verificationId') verificationId: string,
  ): Promise<any> {
    this.logger.log(`Fetching verification status: ${verificationId}`);

    try {
      const verification =
        await this.verificationService.getVerificationStatus(verificationId);
      return verification;
    } catch (error) {
      this.logger.error(
        `Failed to fetch verification status: ${verificationId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get all verifications for a user
   * GET /api/v1/verifications/user/:userId
   */
  @Get('user/:userId')
  @HttpCode(HttpStatus.OK)
  async getUserVerifications(@Param('userId') userId: string): Promise<any[]> {
    this.logger.log(`Fetching verifications for user: ${userId}`);

    try {
      const verifications =
        await this.verificationService.getUserVerifications(userId);
      return verifications;
    } catch (error) {
      this.logger.error(
        `Failed to fetch verifications for user: ${userId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Refresh access token for an active verification
   * POST /api/v1/verifications/:verificationId/refresh-token
   */
  @Post(':verificationId/refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshAccessToken(
    @Param('verificationId') verificationId: string,
  ): Promise<AccessTokenResponseDto> {
    this.logger.log(`Refreshing access token for: ${verificationId}`);

    try {
      const result =
        await this.verificationService.refreshAccessToken(verificationId);
      this.logger.log(`Access token refreshed successfully: ${verificationId}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to refresh access token: ${verificationId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Resubmit verification (for RESUBMIT_REQUIRED status)
   * POST /api/v1/verifications/:verificationId/resubmit
   */
  @Post(':verificationId/resubmit')
  @HttpCode(HttpStatus.OK)
  async resubmitVerification(
    @Param('verificationId') verificationId: string,
  ): Promise<AccessTokenResponseDto> {
    this.logger.log(`Resubmitting verification: ${verificationId}`);

    try {
      const result =
        await this.verificationService.resubmitVerification(verificationId);
      this.logger.log(`Verification resubmitted successfully: ${verificationId}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to resubmit verification: ${verificationId}`,
        error.stack,
      );
      throw error;
    }
  }
}
