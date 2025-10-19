import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WebhookEvent, WebhookEventSchema } from './schemas/webhook-event.schema';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { WebhookVerificationService } from './webhook-verification.service';
import { VerificationModule } from '../verification/verification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WebhookEvent.name, schema: WebhookEventSchema },
    ]),
    VerificationModule,
  ],
  controllers: [WebhookController],
  providers: [WebhookService, WebhookVerificationService],
  exports: [WebhookService],
})
export class WebhookModule {}
