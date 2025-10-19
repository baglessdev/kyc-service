export interface CreateApplicantRequest {
  externalUserId: string;
  email?: string;
  phone?: string;
  fixedInfo?: {
    firstName?: string;
    lastName?: string;
    dob?: string; // YYYY-MM-DD format
    placeOfBirth?: string;
    country?: string;
    nationality?: string;
  };
}

export interface CreateApplicantResponse {
  id: string; // Sumsub applicant ID
  createdAt: string;
  key: string;
  clientId: string;
  inspectionId: string;
  externalUserId: string;
  info: {
    firstName?: string;
    lastName?: string;
    dob?: string;
    country?: string;
  };
  email?: string;
  phone?: string;
  review?: {
    reviewId: string;
    attemptId: string;
    attemptCnt: number;
    levelName: string;
    createDate: string;
    reviewStatus: string;
  };
}

export interface ApplicantStatus {
  id: string;
  createdAt: string;
  key: string;
  clientId: string;
  inspectionId: string;
  externalUserId: string;
  info: {
    firstName?: string;
    lastName?: string;
    dob?: string;
    country?: string;
  };
  review?: {
    reviewId: string;
    attemptId: string;
    attemptCnt: number;
    levelName: string;
    createDate: string;
    reviewDate?: string;
    reviewResult?: {
      reviewAnswer: 'GREEN' | 'RED';
      rejectLabels?: string[];
      reviewRejectType?: 'FINAL' | 'RETRY';
      moderationComment?: string;
      clientComment?: string;
    };
    reviewStatus: string;
  };
}
