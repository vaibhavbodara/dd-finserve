import { Routes } from '@angular/router';
import { CustomerListComponent } from './components/customer-list/customer-list.component';

export const routes: Routes = [
  { path: '', redirectTo: 'customers', pathMatch: 'full' },
  { path: 'customers', component: CustomerListComponent },
  { path: '**', redirectTo: 'customers' },
];
