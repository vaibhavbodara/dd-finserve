import { Routes } from '@angular/router';
import { CustomerListComponent } from './components/customer-list/customer-list.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { EmiCalculatorComponent } from './components/emi-calculator/emi-calculator.component';
import { LoginComponent } from './components/login/login.component';
import { AdvanceFundListComponent } from './components/advance-funds/advance-fund-list/advance-fund-list.component';
import { authGuard, guestGuard, adminGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'calculator', component: EmiCalculatorComponent, canActivate: [authGuard] },
  { path: 'customers', component: CustomerListComponent, canActivate: [authGuard] },
  { path: 'advance-loans', component: AdvanceFundListComponent, canActivate: [authGuard, adminGuard] },
  { path: 'loan-in-advance', redirectTo: 'advance-loans' },
  { path: 'investors', redirectTo: 'advance-loans' },
  { path: '**', redirectTo: 'dashboard' },
];
