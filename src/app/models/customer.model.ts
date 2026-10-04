export interface KycDocument {
  fileName: string;
  fileType: string;
  fileData: string; // base64 data URL or path
  uploadedAt?: Date;
}

export type EmiFrequency = 'Daily' | 'Weekly' | 'Monthly';

export interface PaymentRecord {
  installmentNo: number;
  scheduledDate: string | Date;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Upcoming';
  unpaidPreviousCount?: number;
  previousUnpaidEmi?: number;
  previousPenaltyAmount?: number;
  cumulativePayable?: number;
  penaltyAmount?: number;
  totalPayable?: number;
  isPenaltyPaid?: boolean;
  paidDate?: string | Date;
  paidAmount?: number;
  paymentMode?: string;
  collectorName?: string;
  notes?: string;
}

export interface CustomerEntry {
  _id?: string;
  customerId: string;
  name: string;
  mobileNumber: string;
  address: string;
  loanAmount: number;
  interestRate?: number;
  emiType?: EmiFrequency;
  dailyEMI: number;
  emiAmount?: number;
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
  paymentRecords?: PaymentRecord[];
  penaltyPerDay?: number;
  totalPenaltyPaid?: number;
  overdueCount?: number;
  totalPenalty?: number;
  overdueEmiAmount?: number;
  totalDueToday?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  count?: number;
  data: T;
}

export interface DashboardMetrics {
  totalCustomers: number;
  todaysTotalEmi: number;
  todaysReceived: number;
  pendingEmi: number;
  overdueCustomers: number;
  totalOverduePenalties?: number;
  penaltyPerDay?: number;
  activeLoansCount: number;
  completedLoansCount: number;
  efficiencyPercentage: number;
  totalDisbursed: number;
  totalOutstanding: number;
  totalCollected: number;
  planStats?: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  role: string;
  branch: string;
  employeeId: string;
  avatarColor?: string;
  avatarUrl?: string;
  status: 'Online' | 'Away' | 'On Field';
  dailyTarget?: number;
}
