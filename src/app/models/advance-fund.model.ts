export interface PayoutTransaction {
  _id?: string;
  payoutId?: string;
  payoutDate: string | Date;
  amount: number;
  payoutType: 'Interest' | 'Principal' | 'Both' | 'Settlement';
  principalComponent: number;
  interestComponent: number;
  paymentMode: 'Bank Transfer' | 'UPI' | 'Cash' | 'Cheque';
  transactionRef?: string;
  notes?: string;
  recordedBy?: string;
  createdAt?: string | Date;
}

export interface BankDetails {
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
}

export interface AdvanceFundEntry {
  _id?: string;
  fundCode: string;
  investorName: string;
  mobileNumber: string;
  email?: string;
  address?: string;
  panNumber?: string;
  aadharNumber?: string;
  amountInvested: number;
  interestRate: number;
  interestRateBasis: 'Monthly' | 'Yearly';
  payoutFrequency: 'Monthly' | 'Quarterly' | 'Yearly' | 'At Maturity';
  startDate: string | Date;
  tenureMonths: number;
  maturityDate?: string | Date;
  monthlyInterestAmount?: number;
  totalExpectedInterest?: number;
  totalPrincipalRepaid?: number;
  totalInterestPaid?: number;
  totalPaid?: number;
  remainingPrincipal?: number;
  status: 'Active' | 'Matured' | 'Closed';
  bankDetails?: BankDetails;
  securityCheque?: string;
  notes?: string;
  payoutHistory?: PayoutTransaction[];
  createdBy?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface AdvanceFundSummary {
  totalAdvanceFunds: number;
  activeInvestorsCount: number;
  totalPrincipalRepaid: number;
  totalInterestPaid: number;
  totalPaid: number;
  netOutstandingPrincipal: number;
  monthlyInterestObligation: number;
}

export interface AdvanceFundResponse {
  success: boolean;
  count?: number;
  summary?: AdvanceFundSummary;
  data: AdvanceFundEntry[];
  message?: string;
}

export interface SingleAdvanceFundResponse {
  success: boolean;
  data: AdvanceFundEntry;
  message?: string;
  payout?: PayoutTransaction;
}
