import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Applicant, ApplicantSchema } from './schemas/applicant.schema';
import { ApplicantRepository } from './repositories/applicant.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Applicant.name, schema: ApplicantSchema },
    ]),
  ],
  providers: [ApplicantRepository],
  exports: [ApplicantRepository],
})
export class ApplicantModule {}
