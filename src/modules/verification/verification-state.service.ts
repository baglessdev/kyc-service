import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { VerificationStatus } from '../../common/enums';
import { Logger } from '../../common/utils/logger';

/**
 * Service for managing verification state transitions
 */
@Injectable()
export class VerificationStateService {
  private readonly logger = new Logger(VerificationStateService.name);

  // Valid state transitions map
  private readonly STATE_TRANSITIONS: Record<
    VerificationStatus,
    VerificationStatus[]
  > = {
    [VerificationStatus.INITIATED]: [VerificationStatus.PENDING],
    [VerificationStatus.PENDING]: [
      VerificationStatus.IN_REVIEW,
      VerificationStatus.EXPIRED,
    ],
    [VerificationStatus.IN_REVIEW]: [
      VerificationStatus.APPROVED,
      VerificationStatus.REJECTED,
      VerificationStatus.RESUBMIT_REQUIRED,
    ],
    [VerificationStatus.RESUBMIT_REQUIRED]: [VerificationStatus.PENDING],
    [VerificationStatus.REJECTED]: [],
    [VerificationStatus.APPROVED]: [],
    [VerificationStatus.EXPIRED]: [],
  };

  /**
   * Check if state transition is valid
   */
  isValidTransition(
    currentStatus: VerificationStatus,
    newStatus: VerificationStatus,
  ): boolean {
    const allowedTransitions = this.STATE_TRANSITIONS[currentStatus];
    return allowedTransitions.includes(newStatus);
  }

  /**
   * Validate and execute state transition
   */
  validateTransition(
    currentStatus: VerificationStatus,
    newStatus: VerificationStatus,
  ): void {
    if (!this.isValidTransition(currentStatus, newStatus)) {
      const message = `Invalid state transition from ${currentStatus} to ${newStatus}`;
      this.logger.error(message);
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }

    this.logger.log(
      `Valid state transition: ${currentStatus} -> ${newStatus}`,
    );
  }

  /**
   * Get allowed transitions for current status
   */
  getAllowedTransitions(
    currentStatus: VerificationStatus,
  ): VerificationStatus[] {
    return this.STATE_TRANSITIONS[currentStatus] || [];
  }

  /**
   * Check if status is terminal (final state)
   */
  isTerminalStatus(status: VerificationStatus): boolean {
    return (
      status === VerificationStatus.APPROVED ||
      status === VerificationStatus.REJECTED ||
      status === VerificationStatus.EXPIRED
    );
  }

  /**
   * Check if verification is active (not completed)
   */
  isActiveStatus(status: VerificationStatus): boolean {
    return (
      status === VerificationStatus.INITIATED ||
      status === VerificationStatus.PENDING ||
      status === VerificationStatus.IN_REVIEW ||
      status === VerificationStatus.RESUBMIT_REQUIRED
    );
  }

  /**
   * Determine next status based on Sumsub review result
   */
  getStatusFromReviewResult(reviewAnswer: string, rejectType?: string): VerificationStatus {
    if (reviewAnswer === 'GREEN') {
      return VerificationStatus.APPROVED;
    }

    if (reviewAnswer === 'RED') {
      if (rejectType === 'RETRY') {
        return VerificationStatus.RESUBMIT_REQUIRED;
      }
      return VerificationStatus.REJECTED;
    }

    // Default to in review if unclear
    return VerificationStatus.IN_REVIEW;
  }
}
