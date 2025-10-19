import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Applicant, ApplicantDocument } from '../schemas/applicant.schema';
import { Logger } from '../../../common/utils/logger';

@Injectable()
export class ApplicantRepository {
  private readonly logger = new Logger(ApplicantRepository.name);

  constructor(
    @InjectModel(Applicant.name)
    private applicantModel: Model<ApplicantDocument>,
  ) {}

  /**
   * Create a new applicant
   */
  async create(data: Partial<Applicant>): Promise<ApplicantDocument> {
    this.logger.log(`Creating applicant for userId: ${data.userId}`);
    const applicant = new this.applicantModel(data);
    return applicant.save();
  }

  /**
   * Find applicant by user ID
   */
  async findByUserId(userId: string): Promise<ApplicantDocument | null> {
    return this.applicantModel.findOne({ userId }).exec();
  }

  /**
   * Find applicant by external applicant ID (Sumsub)
   */
  async findByExternalApplicantId(
    externalApplicantId: string,
  ): Promise<ApplicantDocument | null> {
    return this.applicantModel.findOne({ externalApplicantId }).exec();
  }

  /**
   * Find applicant by MongoDB ID
   */
  async findById(id: string): Promise<ApplicantDocument | null> {
    return this.applicantModel.findById(id).exec();
  }

  /**
   * Update applicant
   */
  async update(
    userId: string,
    data: Partial<Applicant>,
  ): Promise<ApplicantDocument | null> {
    this.logger.log(`Updating applicant for userId: ${userId}`);
    return this.applicantModel
      .findOneAndUpdate({ userId }, { $set: data }, { new: true })
      .exec();
  }

  /**
   * Update external applicant ID
   */
  async updateExternalApplicantId(
    userId: string,
    externalApplicantId: string,
  ): Promise<ApplicantDocument | null> {
    this.logger.log(
      `Updating external applicant ID for userId: ${userId} to ${externalApplicantId}`,
    );
    return this.applicantModel
      .findOneAndUpdate(
        { userId },
        { $set: { externalApplicantId } },
        { new: true },
      )
      .exec();
  }

  /**
   * Check if applicant exists by user ID
   */
  async existsByUserId(userId: string): Promise<boolean> {
    const count = await this.applicantModel.countDocuments({ userId }).exec();
    return count > 0;
  }
}
