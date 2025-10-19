import { Injectable } from '@nestjs/common';
import { SumsubClientService } from './sumsub-client.service';
import { Logger } from '../../common/utils/logger';
import {
  CreateApplicantRequest,
  CreateApplicantResponse,
  ApplicantStatus,
  GenerateTokenResponse,
} from './interfaces';

@Injectable()
export class SumsubService {
  private readonly logger = new Logger(SumsubService.name);

  constructor(private sumsubClient: SumsubClientService) {}

  /**
   * Create a new applicant in Sumsub
   * @param request Applicant data
   * @param levelName Verification level (e.g., 'basic-kyc-level')
   * @returns Created applicant details
   */
  async createApplicant(
    request: CreateApplicantRequest,
    levelName: string,
  ): Promise<CreateApplicantResponse> {
    this.logger.log(
      `Creating Sumsub applicant for user: ${request.externalUserId}`,
    );

    const path = `/resources/applicants?levelName=${encodeURIComponent(levelName)}`;

    try {
      const response = await this.sumsubClient.post<CreateApplicantResponse>(
        path,
        request,
      );

      this.logger.log(
        `Sumsub applicant created: ${response.id} for user: ${request.externalUserId}`,
      );

      return response;
    } catch (error) {
      this.logger.error(
        `Failed to create Sumsub applicant for user: ${request.externalUserId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Generate access token for WebSDK
   * @param externalUserId User ID from your system
   * @param levelName Verification level
   * @param ttlInSecs Token TTL in seconds (default: 1 hour)
   * @returns Access token for WebSDK
   */
  async generateAccessToken(
    externalUserId: string,
    levelName: string,
    ttlInSecs = 3600,
  ): Promise<GenerateTokenResponse> {
    this.logger.log(`Generating access token for user: ${externalUserId}`);

    const path = `/resources/accessTokens?userId=${encodeURIComponent(externalUserId)}&levelName=${encodeURIComponent(levelName)}&ttlInSecs=${ttlInSecs}`;

    try {
      const response = await this.sumsubClient.post<GenerateTokenResponse>(
        path,
      );

      this.logger.log(`Access token generated for user: ${externalUserId}`);

      return response;
    } catch (error) {
      this.logger.error(
        `Failed to generate access token for user: ${externalUserId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get applicant status and review results
   * @param applicantId Sumsub applicant ID
   * @returns Applicant status with review details
   */
  async getApplicantStatus(applicantId: string): Promise<ApplicantStatus> {
    this.logger.log(`Getting status for applicant: ${applicantId}`);

    const path = `/resources/applicants/${applicantId}/status`;

    try {
      const response = await this.sumsubClient.get<ApplicantStatus>(path);

      this.logger.log(
        `Applicant status retrieved: ${applicantId} - ${response.review?.reviewStatus}`,
      );

      return response;
    } catch (error) {
      this.logger.error(
        `Failed to get status for applicant: ${applicantId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get full applicant details
   * @param applicantId Sumsub applicant ID
   * @returns Full applicant data
   */
  async getApplicant(applicantId: string): Promise<CreateApplicantResponse> {
    this.logger.log(`Getting details for applicant: ${applicantId}`);

    const path = `/resources/applicants/${applicantId}/one`;

    try {
      const response =
        await this.sumsubClient.get<CreateApplicantResponse>(path);

      this.logger.log(`Applicant details retrieved: ${applicantId}`);

      return response;
    } catch (error) {
      this.logger.error(
        `Failed to get details for applicant: ${applicantId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Reset applicant (allows resubmission for RETRY cases)
   * @param applicantId Sumsub applicant ID
   */
  async resetApplicant(applicantId: string): Promise<void> {
    this.logger.log(`Resetting applicant: ${applicantId}`);

    const path = `/resources/applicants/${applicantId}/reset`;

    try {
      await this.sumsubClient.post(path);
      this.logger.log(`Applicant reset successful: ${applicantId}`);
    } catch (error) {
      this.logger.error(
        `Failed to reset applicant: ${applicantId}`,
        error.stack,
      );
      throw error;
    }
  }
}
