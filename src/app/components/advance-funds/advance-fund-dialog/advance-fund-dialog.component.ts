import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { AdvanceFundEntry } from '../../../models/advance-fund.model';
import { AdvanceFundService } from '../../../services/advance-fund.service';

@Component({
  selector: 'app-advance-fund-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatSnackBarModule,
    MatDividerModule,
  ],
  templateUrl: './advance-fund-dialog.component.html',
  styleUrls: ['./advance-fund-dialog.component.css'],
})
export class AdvanceFundDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<AdvanceFundDialogComponent>);
  private advanceService = inject(AdvanceFundService);
  private snackBar = inject(MatSnackBar);

  form!: FormGroup;
  isEditMode = false;
  isSaving = false;

  calculatedMonthlyInterest = 0;
  calculatedTotalInterest = 0;
  maturityDatePreview = '';

  constructor(@Inject(MAT_DIALOG_DATA) public data?: AdvanceFundEntry | null) {
    this.isEditMode = !!data && !!data._id;
  }

  ngOnInit(): void {
    const today = new Date().toISOString().slice(0, 10);
    const existingDate = this.data?.startDate
      ? new Date(this.data.startDate).toISOString().slice(0, 10)
      : today;

    this.form = this.fb.group({
      investorName: [this.data?.investorName || '', [Validators.required, Validators.minLength(2)]],
      mobileNumber: [
        this.data?.mobileNumber || '',
        [Validators.required, Validators.pattern(/^[0-9+\s-]{10,15}$/)],
      ],
      email: [this.data?.email || '', [Validators.email]],
      address: [this.data?.address || ''],
      panNumber: [
        this.data?.panNumber || '',
        [Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i)],
      ],
      aadharNumber: [this.data?.aadharNumber || ''],
      amountInvested: [
        this.data?.amountInvested || 500000,
        [Validators.required, Validators.min(1000)],
      ],
      interestRate: [
        this.data?.interestRate !== undefined ? this.data.interestRate : 1.5,
        [Validators.required, Validators.min(0)],
      ],
      interestRateBasis: [this.data?.interestRateBasis || 'Monthly', Validators.required],
      payoutFrequency: [this.data?.payoutFrequency || 'Monthly', Validators.required],
      startDate: [existingDate, Validators.required],
      tenureMonths: [this.data?.tenureMonths || 12, [Validators.required, Validators.min(1)]],
      status: [this.data?.status || 'Active', Validators.required],
      bankName: [this.data?.bankDetails?.bankName || ''],
      accountHolderName: [this.data?.bankDetails?.accountHolderName || ''],
      accountNumber: [this.data?.bankDetails?.accountNumber || ''],
      ifscCode: [this.data?.bankDetails?.ifscCode || ''],
      upiId: [this.data?.bankDetails?.upiId || ''],
      securityCheque: [this.data?.securityCheque || ''],
      notes: [this.data?.notes || ''],
    });

    this.updateCalculations();

    // Listen to financial input changes
    this.form.valueChanges.subscribe(() => {
      this.updateCalculations();
    });
  }

  updateCalculations(): void {
    const principal = Number(this.form.get('amountInvested')?.value) || 0;
    const rate = Number(this.form.get('interestRate')?.value) || 0;
    const basis = this.form.get('interestRateBasis')?.value;
    const tenure = Number(this.form.get('tenureMonths')?.value) || 12;
    const startDateVal = this.form.get('startDate')?.value;

    const monthlyRate = basis === 'Yearly' ? rate / 12 : rate;
    this.calculatedMonthlyInterest = Math.round((principal * monthlyRate) / 100);
    this.calculatedTotalInterest = Math.round(this.calculatedMonthlyInterest * tenure);

    if (startDateVal && tenure) {
      const d = new Date(startDateVal);
      d.setMonth(d.getMonth() + tenure);
      this.maturityDatePreview = d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.snackBar.open('Please fill all required fields properly.', 'Close', {
        duration: 3000,
      });
      return;
    }

    this.isSaving = true;
    const val = this.form.value;

    const payload: Partial<AdvanceFundEntry> = {
      investorName: val.investorName,
      mobileNumber: val.mobileNumber,
      email: val.email,
      address: val.address,
      panNumber: val.panNumber ? val.panNumber.toUpperCase() : '',
      aadharNumber: val.aadharNumber,
      amountInvested: Number(val.amountInvested),
      interestRate: Number(val.interestRate),
      interestRateBasis: val.interestRateBasis,
      payoutFrequency: val.payoutFrequency,
      startDate: val.startDate,
      tenureMonths: Number(val.tenureMonths),
      status: val.status,
      bankDetails: {
        bankName: val.bankName,
        accountHolderName: val.accountHolderName || val.investorName,
        accountNumber: val.accountNumber,
        ifscCode: val.ifscCode ? val.ifscCode.toUpperCase() : '',
        upiId: val.upiId,
      },
      securityCheque: val.securityCheque,
      notes: val.notes,
    };

    if (this.isEditMode && this.data?._id) {
      this.advanceService.updateAdvanceFund(this.data._id, payload).subscribe({
        next: (saved) => {
          this.isSaving = false;
          this.dialogRef.close(saved);
        },
        error: (err) => {
          console.error('Update error:', err);
          this.isSaving = false;
          this.snackBar.open('Failed to update advance fund.', 'Close', { duration: 3000 });
        },
      });
    } else {
      this.advanceService.createAdvanceFund(payload).subscribe({
        next: (created) => {
          this.isSaving = false;
          this.dialogRef.close(created);
        },
        error: (err) => {
          console.error('Create error:', err);
          this.isSaving = false;
          this.snackBar.open('Failed to create advance fund.', 'Close', { duration: 3000 });
        },
      });
    }
  }

  close(): void {
    this.dialogRef.close(null);
  }
}
