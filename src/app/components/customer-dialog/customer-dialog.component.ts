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
import { CustomerEntry, KycDocument } from '../../models/customer.model';

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

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CustomerDialogComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data?: CustomerEntry
  ) {}

  ngOnInit() {
    this.isEditMode = !!(this.data && this.data._id);
    const todayStr = new Date().toISOString().slice(0, 10);

    // Initial 100 days default end date
    const defaultEnd = new Date();
    defaultEnd.setDate(defaultEnd.getDate() + 100);
    const defaultEndStr = defaultEnd.toISOString().slice(0, 10);

    this.form = this.fb.group({
      customerId: [this.data?.customerId || this.generateSuggestedId()],
      name: [this.data?.name || '', [Validators.required, Validators.minLength(2)]],
      mobileNumber: [this.data?.mobileNumber || '', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      address: [this.data?.address || '', [Validators.required]],
      loanAmount: [this.data?.loanAmount || 10000, [Validators.required, Validators.min(100)]],
      interestRate: [10, [Validators.min(0)]], // 10% flat microfinance
      totalEMI: [this.data?.totalEMI || 100, [Validators.required, Validators.min(1)]],
      dailyEMI: [this.data?.dailyEMI || 110, [Validators.required, Validators.min(1)]],
      loanStartDate: [this.data?.loanStartDate ? new Date(this.data.loanStartDate) : new Date(), [Validators.required]],
      loanEndDate: [this.data?.loanEndDate ? new Date(this.data.loanEndDate) : defaultEnd, [Validators.required]],
      collectorName: [this.data?.collectorName || 'Agent Rahul', [Validators.required]],
      status: [this.data?.status || 'Active', [Validators.required]],
    });

    if (this.data?.kycDocument?.fileName) {
      this.kycDoc = this.data.kycDocument;
      this.uploadedFileName = this.data.kycDocument.fileName;
    }

    // Auto calculate daily EMI when Loan Amount or Total EMI changes
    this.form.get('loanAmount')?.valueChanges.subscribe(() => this.recalculateEMI());
    this.form.get('totalEMI')?.valueChanges.subscribe(() => {
      this.recalculateEMI();
      this.recalculateEndDate();
    });
    this.form.get('interestRate')?.valueChanges.subscribe(() => this.recalculateEMI());
    this.form.get('loanStartDate')?.valueChanges.subscribe(() => this.recalculateEndDate());
  }

  generateSuggestedId(): string {
    const random = Math.floor(1000 + Math.random() * 9000);
    return `CUST-${random}`;
  }

  recalculateEMI() {
    const principal = Number(this.form.get('loanAmount')?.value) || 0;
    const totalDays = Number(this.form.get('totalEMI')?.value) || 100;
    const rate = Number(this.form.get('interestRate')?.value) || 0;

    if (principal > 0 && totalDays > 0) {
      const interest = (principal * rate) / 100;
      const totalPayable = principal + interest;
      const daily = Math.ceil(totalPayable / totalDays);
      this.form.patchValue({ dailyEMI: daily }, { emitEvent: false });
    }
  }

  recalculateEndDate() {
    const startVal = this.form.get('loanStartDate')?.value;
    const totalDays = Number(this.form.get('totalEMI')?.value) || 100;

    if (startVal && totalDays > 0) {
      const startDate = new Date(startVal);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + totalDays);
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
      dailyEMI: Number(val.dailyEMI),
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
