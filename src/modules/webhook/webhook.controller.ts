import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { WebhookService } from './webhook.service';
import { WebhookVerificationService } from './webhook-verification.service';
import type { SumsubWebhookPayload } from './interfaces/webhook-payload.interface';
import { Logger } from '../../common/utils/logger';

@Controller('api/v1/webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly webhookService: WebhookService,
    private readonly webhookVerificationService: WebhookVerificationService,
  ) {}

  /**
   * Receive webhook events from Sumsub
   * POST /api/v1/webhooks/sumsub
   *
   * Note: This endpoint requires raw body for signature verification
   */
  @Post('sumsub')
  @HttpCode(HttpStatus.OK)
  async handleSumsubWebhook(
    @Body() payload: SumsubWebhookPayload,
    @Headers('x-payload-digest') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ): Promise<{ success: boolean }> {
    this.logger.log(
      `Received Sumsub webhook: ${payload.type} for applicant ${payload.applicantId}`,
    );

    try {
      // Get raw body for signature verification
      const rawBody = request.rawBody?.toString('utf8') || JSON.stringify(payload);

      // Verify webhook signature
      this.webhookVerificationService.verifySignature(rawBody, signature);

      // Process webhook
      await this.webhookService.processWebhook(payload);

      this.logger.log(
        `Successfully processed webhook: ${payload.type} for ${payload.applicantId}`,
      );

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to process webhook: ${payload.type}`,
        error.stack,
      );
      throw error;
    }
  }
}
