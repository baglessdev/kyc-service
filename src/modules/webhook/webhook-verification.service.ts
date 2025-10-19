import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Logger } from '../../common/utils/logger';

/**
 * Service for verifying Sumsub webhook signatures
 * Based on: https://docs.sumsub.com/reference/webhooks#webhook-signature-validation
 */
@Injectable()
export class WebhookVerificationService {
  private readonly logger = new Logger(WebhookVerificationService.name);
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.webhookSecret = this.configService.get<string>(
      'SUMSUB_WEBHOOK_SECRET',
      '',
    );

    if (!this.webhookSecret) {
      this.logger.warn(
        'SUMSUB_WEBHOOK_SECRET not configured - webhook signature verification disabled',
      );
    }
  }

  /**
   * Verify webhook signature from Sumsub
   * @param payload - Raw request body as string
   * @param signature - X-Payload-Digest header value
   * @throws UnauthorizedException if signature is invalid
   */
  verifySignature(payload: string, signature: string): void {
    if (!this.webhookSecret) {
      this.logger.warn(
        'Webhook signature verification skipped - no secret configured',
      );
      return;
    }

    if (!signature) {
      this.logger.error('Webhook signature missing in request headers');
      throw new UnauthorizedException('Webhook signature missing');
    }

    const expectedSignature = this.generateSignature(payload);

    if (!this.secureCompare(signature, expectedSignature)) {
      this.logger.error(
        `Webhook signature verification failed. Received: ${signature.substring(0, 10)}..., Expected: ${expectedSignature.substring(0, 10)}...`,
      );
      throw new UnauthorizedException('Invalid webhook signature');
    }

    this.logger.debug('Webhook signature verified successfully');
  }

  /**
   * Generate HMAC SHA256 signature for webhook payload
   * @param payload - Raw request body as string
   */
  private generateSignature(payload: string): string {
    return crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   * @param a - First string
   * @param b - Second string
   */
  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    // Use crypto.timingSafeEqual for constant-time comparison
    const bufferA = Buffer.from(a, 'utf8');
    const bufferB = Buffer.from(b, 'utf8');

    try {
      return crypto.timingSafeEqual(bufferA, bufferB);
    } catch {
      return false;
    }
  }
}
