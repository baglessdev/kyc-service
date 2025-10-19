import { Types } from 'mongoose';
import { VerificationStatus, ReviewAnswer, RejectType } from '../../../common/enums';

export const mockApplicant = {
  _id: new Types.ObjectId(),
  userId: 'test-user-123',
  externalApplicantId: 'sumsub-applicant-123',
  email: 'test@example.com',
  phone: '+1234567890',
  personalInfo: {
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: new Date('1990-01-01'),
    country: 'USA',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  save: jest.fn(),
};

export const mockVerification = {
  _id: new Types.ObjectId(),
  verificationId: 'ver_test123',
  applicantId: mockApplicant._id,
  userId: 'test-user-123',
  levelName: 'basic-kyc-level',
  status: VerificationStatus.INITIATED,
  externalApplicantId: 'sumsub-applicant-123',
  documents: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  save: jest.fn(),
};

export const mockSumsubApplicant = {
  id: 'sumsub-applicant-123',
  createdAt: new Date().toISOString(),
  key: 'APPLICANT_KEY',
  clientId: 'client-123',
  inspectionId: 'inspection-123',
  externalUserId: 'test-user-123',
  info: {
    firstName: 'John',
    lastName: 'Doe',
    dob: '1990-01-01',
    country: 'USA',
  },
  email: 'test@example.com',
  phone: '+1234567890',
};

export const mockAccessToken = {
  token: 'act-test-token-123',
  userId: 'test-user-123',
};

export const mockReviewResultGreen = {
  reviewAnswer: ReviewAnswer.GREEN,
  rejectType: undefined,
  rejectLabels: [],
  moderationComment: 'All checks passed',
  reviewDate: new Date(),
};

export const mockReviewResultRedRetry = {
  reviewAnswer: ReviewAnswer.RED,
  rejectType: RejectType.RETRY,
  rejectLabels: ['DOCUMENT_MISSING'],
  moderationComment: 'Please upload missing document',
  reviewDate: new Date(),
};

export const mockReviewResultRedFinal = {
  reviewAnswer: ReviewAnswer.RED,
  rejectType: RejectType.FINAL,
  rejectLabels: ['FRAUDULENT_DOCUMENT'],
  moderationComment: 'Document appears to be fraudulent',
  reviewDate: new Date(),
};

export const createMockRepository = () => ({
  create: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByExternalApplicantId: jest.fn(),
  findByVerificationId: jest.fn(),
  findActiveByUserId: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
  updateAccessToken: jest.fn(),
  updateReviewResult: jest.fn(),
  updateExternalApplicantId: jest.fn(),
  existsByUserId: jest.fn(),
  save: jest.fn(),
});

export const createMockSumsubService = () => ({
  createApplicant: jest.fn(),
  generateAccessToken: jest.fn(),
  getApplicantStatus: jest.fn(),
  getApplicant: jest.fn(),
  resetApplicant: jest.fn(),
});
