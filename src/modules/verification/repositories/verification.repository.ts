import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Verification,
  VerificationDocument,
} from '../schemas/verification.schema';
import { VerificationStatus } from '../../../common/enums';
import { Logger } from '../../../common/utils/logger';

@Injectable()
export class VerificationRepository {
  private readonly logger = new Logger(VerificationRepository.name);

  constructor(
    @InjectModel(Verification.name)
    private verificationModel: Model<VerificationDocument>,
  ) {}

  /**
   * Create a new verification
   */
  async create(data: Partial<Verification>): Promise<VerificationDocument> {
    this.logger.log(
      `Creating verification for userId: ${data.userId}, verificationId: ${data.verificationId}`,
    );
    const verification = new this.verificationModel(data);
    return verification.save();
  }

  /**
   * Find verification by verification ID
   */
  async findByVerificationId(
    verificationId: string,
  ): Promise<VerificationDocument | null> {
    return this.verificationModel
      .findOne({ verificationId })
      .populate('applicantId')
      .exec();
  }

  /**
   * Find verifications by user ID
   */
  async findByUserId(userId: string): Promise<VerificationDocument[]> {
    return this.verificationModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .populate('applicantId')
      .exec();
  }

  /**
   * Find verification by external applicant ID
   */
  async findByExternalApplicantId(
    externalApplicantId: string,
  ): Promise<VerificationDocument | null> {
    return this.verificationModel
      .findOne({ externalApplicantId })
      .populate('applicantId')
      .exec();
  }

  /**
   * Find latest verification by user ID
   */
  async findLatestByUserId(
    userId: string,
  ): Promise<VerificationDocument | null> {
    return this.verificationModel
      .findOne({ userId })
      .sort({ createdAt: -1 })
      .populate('applicantId')
      .exec();
  }

  /**
   * Update verification status
   */
  async updateStatus(
    verificationId: string,
    status: VerificationStatus,
    additionalData?: Partial<Verification>,
  ): Promise<VerificationDocument | null> {
    this.logger.log(
      `Updating verification ${verificationId} status to ${status}`,
    );

    const updateData: any = {
      status,
      updatedAt: new Date(),
      ...additionalData,
    };

    // Set timestamp fields based on status
    if (status === VerificationStatus.APPROVED) {
      updateData.approvedAt = new Date();
    } else if (status === VerificationStatus.REJECTED) {
      updateData.rejectedAt = new Date();
    } else if (status === VerificationStatus.IN_REVIEW) {
      updateData.reviewedAt = new Date();
    } else if (status === VerificationStatus.PENDING) {
      updateData.submittedAt = new Date();
    }

    return this.verificationModel
      .findOneAndUpdate(
        { verificationId },
        { $set: updateData },
        { new: true },
      )
      .populate('applicantId')
      .exec();
  }

  /**
   * Update access token
   */
  async updateAccessToken(
    verificationId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    this.logger.log(`Updating access token for verification: ${verificationId}`);
    await this.verificationModel
      .updateOne(
        { verificationId },
        {
          $set: {
            currentAccessToken: {
              tokenHash,
              expiresAt,
              createdAt: new Date(),
            },
          },
        },
      )
      .exec();
  }

  /**
   * Add document to verification
   */
  async addDocument(
    verificationId: string,
    document: {
      type: string;
      subType?: string;
      sumsubImageId?: string;
      status: 'uploaded' | 'processing' | 'verified' | 'rejected';
      rejectionReason?: string;
      uploadedAt: Date;
    },
  ): Promise<void> {
    this.logger.log(
      `Adding document ${document.type} to verification: ${verificationId}`,
    );
    await this.verificationModel
      .updateOne({ verificationId }, { $push: { documents: document } })
      .exec();
  }

  /**
   * Update review result
   */
  async updateReviewResult(
    verificationId: string,
    reviewResult: any,
  ): Promise<VerificationDocument | null> {
    this.logger.log(`Updating review result for verification: ${verificationId}`);
    return this.verificationModel
      .findOneAndUpdate(
        { verificationId },
        {
          $set: {
            reviewResult,
            reviewedAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { new: true },
      )
      .populate('applicantId')
      .exec();
  }

  /**
   * Find verifications by status
   */
  async findByStatus(status: VerificationStatus): Promise<VerificationDocument[]> {
    return this.verificationModel
      .find({ status })
      .sort({ createdAt: -1 })
      .populate('applicantId')
      .exec();
  }

  /**
   * Count verifications by user ID and status
   */
  async countByUserIdAndStatus(
    userId: string,
    status: VerificationStatus,
  ): Promise<number> {
    return this.verificationModel.countDocuments({ userId, status }).exec();
  }

  /**
   * Find active verification (not completed) by user ID
   */
  async findActiveByUserId(
    userId: string,
  ): Promise<VerificationDocument | null> {
    const activeStatuses = [
      VerificationStatus.INITIATED,
      VerificationStatus.PENDING,
      VerificationStatus.IN_REVIEW,
      VerificationStatus.RESUBMIT_REQUIRED,
    ];

    return this.verificationModel
      .findOne({ userId, status: { $in: activeStatuses } })
      .sort({ createdAt: -1 })
      .populate('applicantId')
      .exec();
  }
}
