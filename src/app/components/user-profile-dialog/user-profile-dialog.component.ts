import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UserProfile } from '../../models/customer.model';
import { UserProfileService } from '../../services/user-profile.service';

@Component({
  selector: 'app-user-profile-dialog',
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
  ],
  templateUrl: './user-profile-dialog.component.html',
  styleUrls: ['./user-profile-dialog.component.css'],
})
export class UserProfileDialogComponent implements OnInit {
  form!: FormGroup;
  initials = 'VB';

  roles: string[] = [
    'Admin',
    'Branch Manager & Administrator',
    'Senior Loan Officer',
    'Field Collection Agent',
    'Auditor & Compliance Officer',
    'General Manager',
  ];

  branches: string[] = [
    'Surat Main Branch',
    'Varachha Branch',
    'Katargam Branch',
    'Adajan Branch',
    'Udhna Branch',
    'Head Office',
  ];

  statuses: Array<'Online' | 'Away' | 'On Field'> = ['Online', 'Away', 'On Field'];

  colors: string[] = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#0f766e'];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<UserProfileDialogComponent>,
    private profileService: UserProfileService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data?: UserProfile
  ) {}

  ngOnInit() {
    const p = this.data || this.profileService.currentProfile;
    this.initials = this.profileService.getInitials(p.name);

    this.form = this.fb.group({
      name: [p.name, [Validators.required, Validators.minLength(2)]],
      email: [p.email, [Validators.required, Validators.email]],
      phone: [p.phone, [Validators.required]],
      role: [p.role, [Validators.required]],
      branch: [p.branch, [Validators.required]],
      employeeId: [p.employeeId, [Validators.required]],
      status: [p.status || 'Online', [Validators.required]],
      avatarColor: [p.avatarColor || '#2563eb'],
      dailyTarget: [p.dailyTarget || 50000],
    });

    this.form.get('name')?.valueChanges.subscribe((name) => {
      this.initials = this.profileService.getInitials(name);
    });
  }

  setColor(color: string) {
    this.form.patchValue({ avatarColor: color });
  }

  save() {
    if (this.form.invalid) {
      this.snackBar.open('Please complete required profile fields correctly.', 'Close', { duration: 3000 });
      return;
    }

    const value: UserProfile = this.form.value;
    this.profileService.updateProfile(value);
    this.snackBar.open('Profile updated successfully!', 'OK', { duration: 3000 });
    this.dialogRef.close(value);
  }

  close() {
    this.dialogRef.close();
  }
}
