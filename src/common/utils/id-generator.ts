import { nanoid } from 'nanoid';

export class IdGenerator {
  /**
   * Generate verification ID
   * Format: ver_xxxxxxxxxx
   */
  static generateVerificationId(): string {
    return `ver_${nanoid(12)}`;
  }

  /**
   * Generate applicant ID
   * Format: app_xxxxxxxxxx
   */
  static generateApplicantId(): string {
    return `app_${nanoid(12)}`;
  }

  /**
   * Generate generic ID
   */
  static generate(prefix?: string): string {
    const id = nanoid(12);
    return prefix ? `${prefix}_${id}` : id;
  }
}
