import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CustomerEntry, KycDocument, EmiFrequency } from '../../models/customer.model';

export interface EmiTypeOption {
  value: EmiFrequency;
  label: string;
  hindiLabel: string;
  description: string;
  unit: string;
  tenureLabel: string;
  emiLabel: string;
  defaultTenure: number;
  icon: string;
}

@Component({
  selector: 'app-customer-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  templateUrl: './customer-dialog.component.html',
  styleUrls: ['./customer-dialog.component.css'],
})
export class CustomerDialogComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  kycDoc: KycDocument | null = null;
  uploadedFileName = '';
  uploadedFileSize = '';
  isUploading = false;

  collectors: string[] = ['Agent Rahul', 'Agent Suresh', 'Agent Priya', 'Agent Amit', 'Office Branch'];
  statuses: Array<'Active' | 'Completed' | 'Overdue'> = ['Active', 'Completed', 'Overdue'];

  emiTypeOptions: EmiTypeOption[] = [
    {
      value: 'Daily',
      label: 'Daily Collection',
      hindiLabel: 'हर रोज़ / दैनिक',
      description: 'Daily collection installments',
      unit: 'Days',
      tenureLabel: 'Total EMI (Tenure in Days)',
      emiLabel: 'Daily EMI (₹ / day)',
      defaultTenure: 100,
      icon: 'today',
    },
    {
      value: 'Weekly',
      label: 'Weekly Collection',
      hindiLabel: 'प्रति सप्ताह / साप्ताहिक',
      description: 'Weekly collection installments',
      unit: 'Weeks',
      tenureLabel: 'Total EMI (Tenure in Weeks)',
      emiLabel: 'Weekly EMI (₹ / week)',
      defaultTenure: 12,
      icon: 'date_range',
    },
    {
      value: 'Monthly',
      label: 'Monthly Collection',
      hindiLabel: 'प्रति माह / मासिक',
      description: 'Monthly collection installments',
      unit: 'Months',
      tenureLabel: 'Total EMI (Tenure in Months)',
      emiLabel: 'Monthly EMI (₹ / month)',
      defaultTenure: 6,
      icon: 'calendar_month',
    },
  ];

  private isCalculating = false;

  get selectedEmiConfig(): EmiTypeOption {
    const selected = this.form?.get('emiType')?.value || 'Daily';
    return this.emiTypeOptions.find((o) => o.value === selected) || this.emiTypeOptions[0];
  }

  get periodsPerYear(): number {
    const selected = (this.form?.get('emiType')?.value as EmiFrequency) || 'Daily';
    if (selected === 'Weekly') return 52;
    if (selected === 'Monthly') return 12;
    return 365;
  }

  get calculatedInterestAmount(): number {
    const principal = Number(this.form?.get('loanAmount')?.value) || 0;
    const rate = Number(this.form?.get('interestRate')?.value) || 0;
    const tenure = Number(this.form?.get('totalEMI')?.value) || 1;
    const tenureYears = tenure / this.periodsPerYear;
    return Math.round((principal * rate * tenureYears) / 100);
  }

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CustomerDialogComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data?: CustomerEntry
  ) {}

  ngOnInit() {
    this.isEditMode = !!(this.data && this.data._id);

    const initialEmiType: EmiFrequency = this.data?.emiType || 'Daily';
    const config = this.emiTypeOptions.find((o) => o.value === initialEmiType) || this.emiTypeOptions[0];
    const initialTenure = this.data?.totalEMI || config.defaultTenure;
    const defaultEnd = this.data?.loanEndDate
      ? new Date(this.data.loanEndDate)
      : this.calculateEndDateValue(new Date(), initialTenure, initialEmiType);

    const initialPrincipal = Number(this.data?.loanAmount) || 10000;
    const initialRate = this.data?.interestRate !== undefined ? Number(this.data.interestRate) : 10.5;
    const ppy = initialEmiType === 'Weekly' ? 52 : (initialEmiType === 'Monthly' ? 12 : 365);
    const initialInterest = Math.round((initialPrincipal * initialRate * (initialTenure / ppy)) / 100);
    const initialTotalPayable = this.data?.totalAmount || (initialPrincipal + initialInterest);
    const initialEMI = this.data?.dailyEMI || (initialTenure > 0 ? Math.round(((initialTotalPayable / initialTenure) + Number.EPSILON) * 100) / 100 : 100);

    this.form = this.fb.group({
      customerId: [this.data?.customerId || this.generateSuggestedId()],
      name: [this.data?.name || '', [Validators.required, Validators.minLength(2)]],
      mobileNumber: [this.data?.mobileNumber || '', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      address: [this.data?.address || '', [Validators.required]],
      loanAmount: [initialPrincipal, [Validators.required, Validators.min(100)]],
      interestRate: [initialRate, [Validators.min(0)]], // Fixed % p.a.
      totalAmount: [initialTotalPayable, [Validators.required, Validators.min(100)]],
      emiType: [initialEmiType, [Validators.required]],
      totalEMI: [initialTenure, [Validators.required, Validators.min(1)]],
      dailyEMI: [initialEMI, [Validators.required, Validators.min(1)]],
      loanStartDate: [this.data?.loanStartDate ? new Date(this.data.loanStartDate) : new Date(), [Validators.required]],
      loanEndDate: [defaultEnd, [Validators.required]],
      collectorName: [this.data?.collectorName || 'Agent Rahul', [Validators.required]],
      status: [this.data?.status || 'Active', [Validators.required]],
    });

    if (this.data?.kycDocument?.fileName) {
      this.kycDoc = this.data.kycDocument;
      this.uploadedFileName = this.data.kycDocument.fileName;
    }

    // 1. Changes to Principal or Rate -> recalculate total payable, EMI, and end date
    this.form.get('loanAmount')?.valueChanges.subscribe(() => {
      this.recalculateFromParameters();
    });
    this.form.get('interestRate')?.valueChanges.subscribe(() => {
      this.recalculateFromParameters();
    });

    // 2. Frequency change -> adjust default tenure and recalculate
    this.form.get('emiType')?.valueChanges.subscribe((newType: EmiFrequency) => {
      const opt = this.emiTypeOptions.find((o) => o.value === newType);
      if (opt && !this.isEditMode) {
        this.form.patchValue({ totalEMI: opt.defaultTenure }, { emitEvent: false });
      }
      this.recalculateFromParameters();
    });

    // 3. User modifies Tenure (Total EMI) directly -> recalculate interest, total payable, and EMI
    this.form.get('totalEMI')?.valueChanges.subscribe(() => {
      this.recalculateFromParameters();
    });

    // 4. User modifies EMI Amount (e.g. types round figure 1000 instead of 875.25)
    // -> tenure reduces, total interest reduces, and end date becomes earlier
    this.form.get('dailyEMI')?.valueChanges.subscribe(() => {
      this.recalculateFromCustomEMI();
    });

    // 5. User directly modifies Total Payable Amount -> recalculate installment
    this.form.get('totalAmount')?.valueChanges.subscribe(() => {
      this.onTotalAmountManualChange();
    });

    // 6. Loan Start Date changes -> recalculate end date
    this.form.get('loanStartDate')?.valueChanges.subscribe(() => {
      this.recalculateEndDate();
    });

    // Initial sync if no preset values passed
    if (!this.data || !this.data.totalAmount) {
      this.recalculateFromParameters();
    }
  }

  generateSuggestedId(): string {
    const random = Math.floor(1000 + Math.random() * 9000);
    return `CUST-${random}`;
  }

  calculateEndDateValue(startDate: Date, tenure: number, emiType: EmiFrequency): Date {
    const endDate = new Date(startDate);
    if (emiType === 'Weekly') {
      endDate.setDate(endDate.getDate() + tenure * 7);
    } else if (emiType === 'Monthly') {
      endDate.setMonth(endDate.getMonth() + tenure);
    } else {
      endDate.setDate(endDate.getDate() + tenure);
    }
    return endDate;
  }

  // Base calculation: Fixed Rate (% p.a. on Principal)
  // Interest = (Principal * Rate * TenureYears) / 100
  recalculateFromParameters() {
    if (this.isCalculating || !this.form) return;
    this.isCalculating = true;

    try {
      const principal = Number(this.form.get('loanAmount')?.value) || 0;
      const rate = Number(this.form.get('interestRate')?.value) || 0;
      const tenure = Number(this.form.get('totalEMI')?.value) || 1;
      const emiType = (this.form.get('emiType')?.value as EmiFrequency) || 'Daily';
      const ppy = emiType === 'Weekly' ? 52 : (emiType === 'Monthly' ? 12 : 365);

      const tenureYears = tenure / ppy;
      const interest = Math.round((principal * rate * tenureYears) / 100);
      const totalPayable = principal + interest;
      const emi = tenure > 0 ? Math.round(((totalPayable / tenure) + Number.EPSILON) * 100) / 100 : 0;

      const startDateVal = this.form.get('loanStartDate')?.value || new Date();
      const endDate = this.calculateEndDateValue(new Date(startDateVal), tenure, emiType);

      this.form.patchValue(
        {
          totalAmount: totalPayable,
          dailyEMI: emi,
          loanEndDate: endDate,
        },
        { emitEvent: false }
      );
    } finally {
      this.isCalculating = false;
    }
  }

  // When customer gives custom / round figure payment (e.g. ₹1,000 instead of ₹875.25):
  // Since they pay more per installment, loan pays off faster.
  // Formula: N = Principal / (CustomEMI - InterestPerPeriod)
  // With fewer installments N, tenure in years is smaller -> total interest REDUCES, total payable REDUCES, and end date is EARLIER!
  recalculateFromCustomEMI() {
    if (this.isCalculating || !this.form) return;
    this.isCalculating = true;

    try {
      const principal = Number(this.form.get('loanAmount')?.value) || 0;
      const rate = Number(this.form.get('interestRate')?.value) || 0;
      const customEMI = Number(this.form.get('dailyEMI')?.value) || 0;
      const emiType = (this.form.get('emiType')?.value as EmiFrequency) || 'Daily';
      const ppy = emiType === 'Weekly' ? 52 : (emiType === 'Monthly' ? 12 : 365);

      if (principal <= 0 || customEMI <= 0) return;

      const interestPerPeriod = (principal * rate) / (100 * ppy);

      if (customEMI > interestPerPeriod) {
        const rawTenure = principal / (customEMI - interestPerPeriod);
        const newTenure = Math.max(1, Math.ceil(rawTenure));

        const tenureYears = newTenure / ppy;
        const newInterest = Math.round((principal * rate * tenureYears) / 100);
        const newTotalPayable = principal + newInterest;

        const startDateVal = this.form.get('loanStartDate')?.value || new Date();
        const newEndDate = this.calculateEndDateValue(new Date(startDateVal), newTenure, emiType);

        this.form.patchValue(
          {
            totalEMI: newTenure,
            totalAmount: newTotalPayable,
            loanEndDate: newEndDate,
          },
          { emitEvent: false }
        );
      }
    } finally {
      this.isCalculating = false;
    }
  }

  onTotalAmountManualChange() {
    if (this.isCalculating || !this.form) return;
    this.isCalculating = true;

    try {
      const totalPayable = Number(this.form.get('totalAmount')?.value) || 0;
      const tenure = Number(this.form.get('totalEMI')?.value) || 1;
      if (totalPayable > 0 && tenure > 0) {
        const emi = Math.round(((totalPayable / tenure) + Number.EPSILON) * 100) / 100;
        this.form.patchValue({ dailyEMI: emi }, { emitEvent: false });
      }
    } finally {
      this.isCalculating = false;
    }
  }

  recalculateEndDate() {
    if (this.isCalculating || !this.form) return;
    const startVal = this.form.get('loanStartDate')?.value;
    const tenure = Number(this.form.get('totalEMI')?.value) || 0;
    const emiType = (this.form.get('emiType')?.value as EmiFrequency) || 'Daily';

    if (startVal && tenure > 0) {
      const endDate = this.calculateEndDateValue(new Date(startVal), tenure, emiType);
      this.form.patchValue({ loanEndDate: endDate }, { emitEvent: false });
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 15 * 1024 * 1024) {
        this.snackBar.open('File size must be under 15MB', 'Close', { duration: 3000 });
        return;
      }

      this.isUploading = true;
      this.uploadedFileName = file.name;
      this.uploadedFileSize = (file.size / 1024).toFixed(1) + ' KB';

      const reader = new FileReader();
      reader.onload = () => {
        this.kycDoc = {
          fileName: file.name,
          fileType: file.type,
          fileData: reader.result as string,
          uploadedAt: new Date(),
        };
        this.isUploading = false;
        this.snackBar.open(`KYC Document "${file.name}" ready to upload`, 'OK', { duration: 2500 });
      };
      reader.onerror = () => {
        this.isUploading = false;
        this.snackBar.open('Error reading file', 'Close', { duration: 3000 });
      };
      reader.readAsDataURL(file);
    }
  }

  removeFile(event: Event) {
    event.stopPropagation();
    this.kycDoc = null;
    this.uploadedFileName = '';
    this.uploadedFileSize = '';
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Please fill all required fields correctly', 'Close', { duration: 3000 });
      return;
    }

    const val = this.form.value;
    const customerPayload: Partial<CustomerEntry> = {
      customerId: val.customerId,
      name: val.name.trim(),
      mobileNumber: val.mobileNumber.trim(),
      address: val.address.trim(),
      loanAmount: Number(val.loanAmount),
      interestRate: Number(val.interestRate),
      totalAmount: Number(val.totalAmount),
      remainingBalance: Number(val.totalAmount),
      emiType: val.emiType,
      dailyEMI: Number(val.dailyEMI),
      emiAmount: Number(val.dailyEMI),
      totalEMI: Number(val.totalEMI),
      loanStartDate: val.loanStartDate,
      loanEndDate: val.loanEndDate,
      collectorName: val.collectorName,
      status: val.status,
      kycDocument: this.kycDoc || undefined,
    };

    if (this.isEditMode && this.data?._id) {
      customerPayload._id = this.data._id;
    }

    this.dialogRef.close(customerPayload);
  }
}
