import { Component, Output, EventEmitter, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CustomerService } from '../../services/customer.service';
import { UserProfileService } from '../../services/user-profile.service';
import { UserProfile } from '../../models/customer.model';
import { UserProfileDialogComponent } from '../user-profile-dialog/user-profile-dialog.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit {
  @Output() addCustomerClicked = new EventEmitter<void>();

  private customerService = inject(CustomerService);
  private profileService = inject(UserProfileService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  backendOnline = false;
  databaseStatus = 'connecting...';

  profile: UserProfile = this.profileService.currentProfile;
  initials = 'VB';
  isAdmin = false;

  ngOnInit() {
    this.checkHealth();

    this.profileService.profile$.subscribe((p) => {
      this.profile = p;
      this.initials = this.profileService.getInitials(p.name);
      this.isAdmin = this.profileService.isAdmin();
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  checkHealth() {
    this.customerService.checkHealth().subscribe((res) => {
      this.backendOnline = res.online;
      this.databaseStatus = res.database;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  onAddCustomer() {
    this.addCustomerClicked.emit();
  }

  openProfileDialog() {
    this.dialog.open(UserProfileDialogComponent, {
      width: '640px',
      data: this.profile,
    });
  }

  setStatus(status: 'Online' | 'Away' | 'On Field') {
    this.profileService.setStatus(status);
    this.snackBar.open(`Status changed to ${status}`, 'OK', { duration: 2500 });
  }

  logout() {
    this.snackBar.open(`User ${this.profile.name} signed out.`, 'OK', { duration: 3000 });
    this.authService.logout();
  }
}
