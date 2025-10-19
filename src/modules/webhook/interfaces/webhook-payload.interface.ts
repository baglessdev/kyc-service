import { ReviewAnswer, RejectType } from '../../../common/enums';

/**
 * Sumsub Webhook Payload Structure
 * Based on: https://docs.sumsub.com/reference/webhooks
 */
export interface SumsubWebhookPayload {
  applicantId: string;
  inspectionId: string;
  applicantType: string;
  correlationId: string;
  levelName: string;
  externalUserId: string;
  type: WebhookEventType;
  reviewStatus: ReviewStatus;
  createdAt: string;
  sandboxMode?: boolean;

  // Review result details
  reviewResult?: {
    reviewAnswer: ReviewAnswer;
    rejectLabels?: string[];
    rejectType?: RejectType;
    moderationComment?: string;
    clientComment?: string;
  };

  // Applicant personal info (included in some events)
  clientId?: string;
  externalApplicantActionId?: string;
}

/**
 * Webhook event types from Sumsub
 */
export enum WebhookEventType {
  APPLICANT_CREATED = 'applicantCreated',
  APPLICANT_PENDING = 'applicantPending',
  APPLICANT_REVIEWED = 'applicantReviewed',
  APPLICANT_RESET = 'applicantReset',
  APPLICANT_ON_HOLD = 'applicantOnHold',
  APPLICANT_WORKFLOW_COMPLETED = 'applicantWorkflowCompleted',
}

/**
 * Review status values
 */
export enum ReviewStatus {
  INIT = 'init',
  PENDING = 'pending',
  PRECHECKED = 'prechecked',
  QUEUED = 'queued',
  COMPLETED = 'completed',
  ON_HOLD = 'onHold',
}
