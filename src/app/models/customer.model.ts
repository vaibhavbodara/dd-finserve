export interface KycDocument {
  fileName: string;
  fileType: string;
  fileData: string; // base64 data URL or path
  uploadedAt?: Date;
}

export interface CustomerEntry {
  _id?: string;
  customerId: string;
  name: string;
  mobileNumber: string;
  address: string;
  loanAmount: number;
  dailyEMI: number;
  totalEMI: number;
  paidEMI?: number;
  remainingBalance?: number;
  totalAmount?: number;
  totalPaid?: number;
  loanStartDate: string | Date;
  loanEndDate?: string | Date;
  collectorName: string;
  kycDocument?: KycDocument;
  status: 'Active' | 'Completed' | 'Overdue';
  createdAt?: string | Date;
  notes?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  count?: number;
  data: T;
}
