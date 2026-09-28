import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { ApiResponse, CustomerEntry, DashboardMetrics } from '../models/customer.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CustomerService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/customers`;
  private healthUrl = `${environment.apiUrl}/health`;
  private metricsUrl = `${environment.apiUrl}/dashboard/metrics`;

  constructor() {
    // Purge any legacy mock customer cache from localStorage
    try {
      const stored = localStorage.getItem('dd_finserve_customers');
      if (stored && (stored.includes('mock-') || stored.includes('cust-1'))) {
        localStorage.removeItem('dd_finserve_customers');
      }
    } catch {
      // Ignore storage errors
    }
  }

  // Check backend server health
  checkHealth(): Observable<{ online: boolean; database: string }> {
    return this.http.get<{ status: string; database: string }>(this.healthUrl).pipe(
      map((res) => ({ online: res.status === 'ok' || res.status === 'degraded', database: res.database })),
      catchError(() => of({ online: false, database: 'disconnected' }))
    );
  }

  // GET: Fetch dashboard KPI metrics directly from MongoDB
  getDashboardMetrics(): Observable<DashboardMetrics> {
    return this.http.get<ApiResponse<DashboardMetrics>>(this.metricsUrl).pipe(
      map((res) => res.data)
    );
  }

  // GET: Fetch all customers with optional search & filters directly from MongoDB
  getCustomers(search?: string, status?: string, collectorName?: string): Observable<CustomerEntry[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (status) params = params.set('status', status);
    if (collectorName) params = params.set('collectorName', collectorName);

    return this.http.get<ApiResponse<CustomerEntry[]>>(this.apiUrl, { params }).pipe(
      map((res) => res.data || [])
    );
  }

  // POST: Add new customer + loan directly to MongoDB
  createCustomer(entry: Partial<CustomerEntry>): Observable<CustomerEntry> {
    return this.http.post<ApiResponse<CustomerEntry>>(this.apiUrl, entry).pipe(
      map((res) => res.data)
    );
  }

  // PUT: Update customer directly in MongoDB
  updateCustomer(id: string, entry: Partial<CustomerEntry>): Observable<CustomerEntry> {
    return this.http.put<ApiResponse<CustomerEntry>>(`${this.apiUrl}/${id}`, entry).pipe(
      map((res) => res.data)
    );
  }

  // DELETE: Delete customer directly in MongoDB
  deleteCustomer(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`).pipe(
      map((res) => res.success)
    );
  }
}
