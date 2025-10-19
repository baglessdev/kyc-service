/**
 * Helper to create test data for E2E tests
 */
export class TestDataHelper {
  /**
   * Create valid initiate verification DTO
   */
  static createInitiateVerificationDto(overrides?: Partial<any>) {
    return {
      userId: 'test-user-123',
      email: 'test@example.com',
      phone: '+1234567890',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      country: 'USA',
      ...overrides,
    };
  }

  /**
   * Create multiple unique users
   */
  static createMultipleUsers(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      userId: `test-user-${i + 1}`,
      email: `test${i + 1}@example.com`,
      phone: `+123456789${i}`,
      firstName: `User${i + 1}`,
      lastName: 'Test',
      dateOfBirth: '1990-01-01',
      country: 'USA',
    }));
  }

  /**
   * Generate random user ID
   */
  static randomUserId(): string {
    return `user-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Generate random email
   */
  static randomEmail(): string {
    return `test-${Math.random().toString(36).substring(7)}@example.com`;
  }
}
