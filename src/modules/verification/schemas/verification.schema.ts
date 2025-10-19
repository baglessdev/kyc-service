import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  VerificationStatus,
  ReviewAnswer,
  RejectType,
} from '../../../common/enums';

@Schema({ timestamps: true, collection: 'verifications' })
export class Verification {
  @Prop({ required: true, unique: true, index: true })
  verificationId: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Applicant', index: true })
  applicantId: Types.ObjectId;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  levelName: string;

  @Prop({
    required: true,
    type: String,
    enum: Object.values(VerificationStatus),
    index: true,
  })
  status: VerificationStatus;

  @Prop()
  externalApplicantId?: string;

  @Prop()
  inspectionId?: string;

  @Prop({
    type: {
      reviewAnswer: { type: String, enum: Object.values(ReviewAnswer) },
      rejectType: { type: String, enum: Object.values(RejectType) },
      rejectLabels: [{ type: String }],
      moderationComment: { type: String },
      clientComment: { type: String },
      reviewDate: { type: Date },
    },
  })
  reviewResult?: {
    reviewAnswer: ReviewAnswer;
    rejectType?: RejectType;
    rejectLabels: string[];
    moderationComment?: string;
    clientComment?: string;
    reviewDate: Date;
  };

  @Prop({
    type: [
      {
        type: { type: String, required: true },
        subType: { type: String },
        sumsubImageId: { type: String },
        status: {
          type: String,
          enum: ['uploaded', 'processing', 'verified', 'rejected'],
          default: 'uploaded',
        },
        rejectionReason: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  documents: Array<{
    type: string;
    subType?: string;
    sumsubImageId?: string;
    status: 'uploaded' | 'processing' | 'verified' | 'rejected';
    rejectionReason?: string;
    uploadedAt: Date;
  }>;

  @Prop({
    type: {
      tokenHash: { type: String },
      expiresAt: { type: Date },
      createdAt: { type: Date },
    },
  })
  currentAccessToken?: {
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
  };

  @Prop()
  submittedAt?: Date;

  @Prop()
  reviewedAt?: Date;

  @Prop()
  approvedAt?: Date;

  @Prop()
  rejectedAt?: Date;
}

export type VerificationDocument = Verification & Document;
export const VerificationSchema = SchemaFactory.createForClass(Verification);

// Compound indexes for common queries
VerificationSchema.index({ userId: 1, status: 1 });
VerificationSchema.index({ userId: 1, createdAt: -1 });
VerificationSchema.index({ externalApplicantId: 1 }, { sparse: true });
