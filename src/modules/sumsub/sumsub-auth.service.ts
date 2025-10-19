import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class SumsubAuthService {
  private readonly appToken: string;
  private readonly secretKey: string;

  constructor(private configService: ConfigService) {
    this.appToken = this.configService.get<string>('sumsub.appToken') || '';
    this.secretKey = this.configService.get<string>('sumsub.secretKey') || '';
  }

  /**
   * Generate HMAC signature for Sumsub API requests
   * @param method HTTP method (GET, POST, etc.)
   * @param path API path (e.g., /resources/applicants)
   * @param timestamp Unix timestamp
   * @param body Request body (optional)
   * @returns HMAC SHA256 signature
   */
  generateSignature(
    method: string,
    path: string,
    timestamp: number,
    body?: string,
  ): string {
    const data = timestamp + method.toUpperCase() + path + (body || '');
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(data)
      .digest('hex');
  }

  /**
   * Generate authentication headers for Sumsub API requests
   * @param method HTTP method
   * @param path API path
   * @param body Request body (optional)
   * @returns Headers object with authentication
   */
  getAuthHeaders(
    method: string,
    path: string,
    body?: any,
  ): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000);
    const bodyString = body ? JSON.stringify(body) : undefined;
    const signature = this.generateSignature(method, path, timestamp, bodyString);

    return {
      'X-App-Token': this.appToken,
      'X-App-Access-Ts': timestamp.toString(),
      'X-App-Access-Sig': signature,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Verify webhook signature from Sumsub
   * @param payload Webhook payload as string
   * @param signature Signature from X-Payload-Digest header
   * @returns True if signature is valid
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const webhookSecret = this.configService.get<string>(
      'sumsub.webhookSecret',
    );
    if (!webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch (error) {
      return false;
    }
  }
}
