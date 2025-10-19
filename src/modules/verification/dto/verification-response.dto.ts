import { VerificationStatus, ReviewAnswer, RejectType } from '../../../common/enums';

export class VerificationResponseDto {
  verificationId: string;
  applicantId: string;
  userId: string;
  status: VerificationStatus;
  levelName: string;
  externalApplicantId?: string;
  reviewResult?: {
    reviewAnswer: ReviewAnswer;
    rejectType?: RejectType;
    rejectLabels: string[];
    moderationComment?: string;
    reviewDate: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  reviewedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
}
