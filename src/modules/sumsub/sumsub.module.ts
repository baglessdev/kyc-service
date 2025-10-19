import { Module } from '@nestjs/common';
import { SumsubService } from './sumsub.service';
import { SumsubClientService } from './sumsub-client.service';
import { SumsubAuthService } from './sumsub-auth.service';

@Module({
  providers: [SumsubService, SumsubClientService, SumsubAuthService],
  exports: [SumsubService, SumsubAuthService],
})
export class SumsubModule {}
