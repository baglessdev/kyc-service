import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VerificationRepository } from '../verification/repositories/verification.repository';
import { VerificationStateService } from '../verification/verification-state.service';
import { WebhookEvent, WebhookEventDocument } from './schemas/webhook-event.schema';
import {
  SumsubWebhookPayload,
  WebhookEventType,
  ReviewStatus,
} from './interfaces/webhook-payload.interface';
import { VerificationStatus, ReviewAnswer } from '../../common/enums';
import { Logger } from '../../common/utils/logger';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectModel(WebhookEvent.name)
    private readonly webhookEventModel: Model<WebhookEventDocument>,
    private readonly verificationRepository: VerificationRepository,
    private readonly verificationStateService: VerificationStateService,
  ) {}

  /**
   * Process webhook event from Sumsub
   * @param payload - Webhook payload from Sumsub
   */
  async processWebhook(payload: SumsubWebhookPayload): Promise<void> {
    this.logger.log(
      `Processing webhook: ${payload.type} for applicant ${payload.applicantId}`,
    );

    // Store webhook event for audit trail
    await this.storeWebhookEvent(payload);

    // Find verification by external applicant ID
    const verification = await this.verificationRepository.findByExternalApplicantId(
      payload.applicantId,
    );

    if (!verification) {
      this.logger.warn(
        `Verification not found for applicant: ${payload.applicantId}`,
      );
      // Not throwing error - webhook might arrive before our verification is created
      return;
    }

    // Process based on event type
    switch (payload.type) {
      case WebhookEventType.APPLICANT_PENDING:
        await this.handleApplicantPending(verification.verificationId);
        break;

      case WebhookEventType.APPLICANT_REVIEWED:
        await this.handleApplicantReviewed(verification.verificationId, payload);
        break;

      case WebhookEventType.APPLICANT_RESET:
        this.logger.log(
          `Applicant reset event received for: ${verification.verificationId}`,
        );
        // Already handled by resubmitVerification method
        break;

      case WebhookEventType.APPLICANT_WORKFLOW_COMPLETED:
        this.logger.log(
          `Workflow completed for: ${verification.verificationId}`,
        );
        // Additional processing if needed
        break;

      default:
        this.logger.debug(
          `Unhandled webhook event type: ${payload.type} for ${verification.verificationId}`,
        );
    }
  }

  /**
   * Handle applicant pending event (user submitted documents)
   */
  private async handleApplicantPending(verificationId: string): Promise<void> {
    this.logger.log(`Handling pending event for: ${verificationId}`);

    const verification = await this.verificationRepository.findByVerificationId(
      verificationId,
    );

    if (!verification) {
      return;
    }

    // Transition to IN_REVIEW if currently PENDING
    if (verification.status === VerificationStatus.PENDING) {
      await this.verificationRepository.updateStatus(
        verificationId,
        VerificationStatus.IN_REVIEW,
        { submittedAt: new Date() },
      );
      this.logger.log(`Updated status to IN_REVIEW: ${verificationId}`);
    }
  }

  /**
   * Handle applicant reviewed event (Sumsub completed review)
   */
  private async handleApplicantReviewed(
    verificationId: string,
    payload: SumsubWebhookPayload,
  ): Promise<void> {
    this.logger.log(`Handling reviewed event for: ${verificationId}`);

    if (!payload.reviewResult) {
      this.logger.warn(`Review result missing in webhook payload for: ${verificationId}`);
      return;
    }

    const verification = await this.verificationRepository.findByVerificationId(
      verificationId,
    );

    if (!verification) {
      return;
    }

    // Determine new verification status based on review result
    const newStatus = this.verificationStateService.getStatusFromReviewResult(
      payload.reviewResult.reviewAnswer,
      payload.reviewResult.rejectType,
    );

    // Validate state transition
    try {
      this.verificationStateService.validateTransition(
        verification.status,
        newStatus,
      );
    } catch (error) {
      this.logger.error(
        `Invalid state transition for ${verificationId}: ${verification.status} -> ${newStatus}`,
        error.stack,
      );
      return;
    }

    // Update verification with review result
    const reviewResult = {
      reviewAnswer: payload.reviewResult.reviewAnswer,
      rejectType: payload.reviewResult.rejectType,
      rejectLabels: payload.reviewResult.rejectLabels || [],
      moderationComment: payload.reviewResult.moderationComment,
      clientComment: payload.reviewResult.clientComment,
      reviewDate: new Date(),
    };

    await this.verificationRepository.updateStatus(verificationId, newStatus, {
      reviewResult,
      reviewedAt: new Date(),
      inspectionId: payload.inspectionId,
    });

    this.logger.log(
      `Updated verification ${verificationId} to ${newStatus} with result: ${payload.reviewResult.reviewAnswer}`,
    );
  }

  /**
   * Store webhook event in database for audit trail
   */
  private async storeWebhookEvent(
    payload: SumsubWebhookPayload,
  ): Promise<WebhookEventDocument> {
    try {
      const webhookEvent = new this.webhookEventModel({
        eventType: payload.type,
        externalApplicantId: payload.applicantId,
        inspectionId: payload.inspectionId,
        payload: payload,
        receivedAt: new Date(),
        processed: true,
      });

      await webhookEvent.save();
      this.logger.debug(`Webhook event stored: ${payload.type}`);
      return webhookEvent;
    } catch (error) {
      this.logger.error('Failed to store webhook event', error.stack);
      throw error;
    }
  }
}
