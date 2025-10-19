import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'applicants' })
export class Applicant {
  @Prop({ required: true, unique: true, index: true })
  userId: string;

  @Prop({ index: true, sparse: true })
  externalApplicantId?: string;

  @Prop({ required: true })
  email: string;

  @Prop()
  phone?: string;

  @Prop({
    type: {
      firstName: { type: String },
      lastName: { type: String },
      dateOfBirth: { type: Date },
      country: { type: String },
      nationality: { type: String },
    },
  })
  personalInfo?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: Date;
    country?: string;
    nationality?: string;
  };

  @Prop({
    type: {
      ipAddress: { type: String },
      userAgent: { type: String },
    },
  })
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
  };
}

export type ApplicantDocument = Applicant & Document;
export const ApplicantSchema = SchemaFactory.createForClass(Applicant);

// Additional indexes
ApplicantSchema.index({ email: 1 });
ApplicantSchema.index({ createdAt: -1 });
