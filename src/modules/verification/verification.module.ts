import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Verification, VerificationSchema } from './schemas/verification.schema';
import { VerificationRepository } from './repositories/verification.repository';
import { VerificationService } from './verification.service';
import { VerificationStateService } from './verification-state.service';
import { VerificationController } from './verification.controller';
import { ApplicantModule } from '../applicant/applicant.module';
import { SumsubModule } from '../sumsub/sumsub.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Verification.name, schema: VerificationSchema },
    ]),
    ApplicantModule,
    SumsubModule,
  ],
  controllers: [VerificationController],
  providers: [
    VerificationRepository,
    VerificationService,
    VerificationStateService,
  ],
  exports: [VerificationService, VerificationStateService, VerificationRepository],
})
export class VerificationModule {}
