export type RequestType = 'REFILL' | 'RETIRE' | 'BUY_NEW' | 'EXTEND_WARRANTY';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Request {
  id: string;
  organizationId: string;
  type: RequestType;
  assetId?: string;
  assetName?: string;
  warrantyId?: string;
  description: string;
  status: RequestStatus;
  decisionBy?: string;
  decisionAt?: Date;
  createdAt: Date;
  createdBy: string;
  createdByName?: string;
  createdByEmail?: string;
  updatedAt: Date;
  updatedBy: string;
}
