import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { VerificationStateService } from '../verification-state.service';
import { VerificationStatus } from '../../../common/enums';

describe('VerificationStateService', () => {
  let service: VerificationStateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VerificationStateService],
    }).compile();

    service = module.get<VerificationStateService>(VerificationStateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isValidTransition', () => {
    it('should allow INITIATED -> PENDING', () => {
      const result = service.isValidTransition(
        VerificationStatus.INITIATED,
        VerificationStatus.PENDING,
      );
      expect(result).toBe(true);
    });

    it('should allow PENDING -> IN_REVIEW', () => {
      const result = service.isValidTransition(
        VerificationStatus.PENDING,
        VerificationStatus.IN_REVIEW,
      );
      expect(result).toBe(true);
    });

    it('should allow IN_REVIEW -> APPROVED', () => {
      const result = service.isValidTransition(
        VerificationStatus.IN_REVIEW,
        VerificationStatus.APPROVED,
      );
      expect(result).toBe(true);
    });

    it('should allow IN_REVIEW -> REJECTED', () => {
      const result = service.isValidTransition(
        VerificationStatus.IN_REVIEW,
        VerificationStatus.REJECTED,
      );
      expect(result).toBe(true);
    });

    it('should allow IN_REVIEW -> RESUBMIT_REQUIRED', () => {
      const result = service.isValidTransition(
        VerificationStatus.IN_REVIEW,
        VerificationStatus.RESUBMIT_REQUIRED,
      );
      expect(result).toBe(true);
    });

    it('should allow RESUBMIT_REQUIRED -> PENDING', () => {
      const result = service.isValidTransition(
        VerificationStatus.RESUBMIT_REQUIRED,
        VerificationStatus.PENDING,
      );
      expect(result).toBe(true);
    });

    it('should NOT allow INITIATED -> APPROVED (skipping states)', () => {
      const result = service.isValidTransition(
        VerificationStatus.INITIATED,
        VerificationStatus.APPROVED,
      );
      expect(result).toBe(false);
    });

    it('should NOT allow APPROVED -> PENDING (backward transition)', () => {
      const result = service.isValidTransition(
        VerificationStatus.APPROVED,
        VerificationStatus.PENDING,
      );
      expect(result).toBe(false);
    });

    it('should NOT allow REJECTED -> any status (terminal state)', () => {
      const result = service.isValidTransition(
        VerificationStatus.REJECTED,
        VerificationStatus.PENDING,
      );
      expect(result).toBe(false);
    });
  });

  describe('validateTransition', () => {
    it('should not throw for valid transition', () => {
      expect(() => {
        service.validateTransition(
          VerificationStatus.INITIATED,
          VerificationStatus.PENDING,
        );
      }).not.toThrow();
    });

    it('should throw HttpException for invalid transition', () => {
      expect(() => {
        service.validateTransition(
          VerificationStatus.INITIATED,
          VerificationStatus.APPROVED,
        );
      }).toThrow(HttpException);
    });

    it('should throw with correct error message', () => {
      try {
        service.validateTransition(
          VerificationStatus.APPROVED,
          VerificationStatus.PENDING,
        );
      } catch (error) {
        expect(error.message).toContain('Invalid state transition');
        expect(error.message).toContain('approved');
        expect(error.message).toContain('pending');
      }
    });
  });

  describe('getAllowedTransitions', () => {
    it('should return correct transitions for INITIATED', () => {
      const transitions = service.getAllowedTransitions(
        VerificationStatus.INITIATED,
      );
      expect(transitions).toEqual([VerificationStatus.PENDING]);
    });

    it('should return correct transitions for IN_REVIEW', () => {
      const transitions = service.getAllowedTransitions(
        VerificationStatus.IN_REVIEW,
      );
      expect(transitions).toContain(VerificationStatus.APPROVED);
      expect(transitions).toContain(VerificationStatus.REJECTED);
      expect(transitions).toContain(VerificationStatus.RESUBMIT_REQUIRED);
      expect(transitions).toHaveLength(3);
    });

    it('should return empty array for terminal states', () => {
      const transitions = service.getAllowedTransitions(
        VerificationStatus.APPROVED,
      );
      expect(transitions).toEqual([]);
    });
  });

  describe('isTerminalStatus', () => {
    it('should return true for APPROVED', () => {
      expect(service.isTerminalStatus(VerificationStatus.APPROVED)).toBe(true);
    });

    it('should return true for REJECTED', () => {
      expect(service.isTerminalStatus(VerificationStatus.REJECTED)).toBe(true);
    });

    it('should return true for EXPIRED', () => {
      expect(service.isTerminalStatus(VerificationStatus.EXPIRED)).toBe(true);
    });

    it('should return false for INITIATED', () => {
      expect(service.isTerminalStatus(VerificationStatus.INITIATED)).toBe(false);
    });

    it('should return false for PENDING', () => {
      expect(service.isTerminalStatus(VerificationStatus.PENDING)).toBe(false);
    });
  });

  describe('isActiveStatus', () => {
    it('should return true for INITIATED', () => {
      expect(service.isActiveStatus(VerificationStatus.INITIATED)).toBe(true);
    });

    it('should return true for PENDING', () => {
      expect(service.isActiveStatus(VerificationStatus.PENDING)).toBe(true);
    });

    it('should return true for IN_REVIEW', () => {
      expect(service.isActiveStatus(VerificationStatus.IN_REVIEW)).toBe(true);
    });

    it('should return true for RESUBMIT_REQUIRED', () => {
      expect(service.isActiveStatus(VerificationStatus.RESUBMIT_REQUIRED)).toBe(true);
    });

    it('should return false for APPROVED', () => {
      expect(service.isActiveStatus(VerificationStatus.APPROVED)).toBe(false);
    });

    it('should return false for REJECTED', () => {
      expect(service.isActiveStatus(VerificationStatus.REJECTED)).toBe(false);
    });
  });

  describe('getStatusFromReviewResult', () => {
    it('should return APPROVED for GREEN review', () => {
      const status = service.getStatusFromReviewResult('GREEN');
      expect(status).toBe(VerificationStatus.APPROVED);
    });

    it('should return RESUBMIT_REQUIRED for RED with RETRY', () => {
      const status = service.getStatusFromReviewResult('RED', 'RETRY');
      expect(status).toBe(VerificationStatus.RESUBMIT_REQUIRED);
    });

    it('should return REJECTED for RED with FINAL', () => {
      const status = service.getStatusFromReviewResult('RED', 'FINAL');
      expect(status).toBe(VerificationStatus.REJECTED);
    });

    it('should return REJECTED for RED without reject type', () => {
      const status = service.getStatusFromReviewResult('RED');
      expect(status).toBe(VerificationStatus.REJECTED);
    });

    it('should return IN_REVIEW for unknown review answer', () => {
      const status = service.getStatusFromReviewResult('UNKNOWN');
      expect(status).toBe(VerificationStatus.IN_REVIEW);
    });
  });
});
