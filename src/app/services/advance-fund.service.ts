import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  AdvanceFundEntry,
  AdvanceFundResponse,
  SingleAdvanceFundResponse,
  PayoutTransaction,
} from '../models/advance-fund.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AdvanceFundService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/advance-funds`;

  // GET: Fetch all advance funds with optional search and status filter
  getAdvanceFunds(search?: string, status?: string): Observable<AdvanceFundResponse> {
    let params = new HttpParams();
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    if (status && status !== 'All') {
      params = params.set('status', status);
    }

    return this.http.get<AdvanceFundResponse>(this.apiUrl, { params });
  }

  // GET: Fetch single advance fund by ID
  getAdvanceFundById(id: string): Observable<AdvanceFundEntry> {
    return this.http
      .get<SingleAdvanceFundResponse>(`${this.apiUrl}/${id}`)
      .pipe(map((res) => res.data));
  }

  // POST: Create new advance fund / investor
  createAdvanceFund(data: Partial<AdvanceFundEntry>): Observable<AdvanceFundEntry> {
    return this.http
      .post<SingleAdvanceFundResponse>(this.apiUrl, data)
      .pipe(map((res) => res.data));
  }

  // PUT: Update advance fund / investor
  updateAdvanceFund(id: string, data: Partial<AdvanceFundEntry>): Observable<AdvanceFundEntry> {
    return this.http
      .put<SingleAdvanceFundResponse>(`${this.apiUrl}/${id}`, data)
      .pipe(map((res) => res.data));
  }

  // POST: Record payout to investor
  recordPayout(id: string, payoutData: Partial<PayoutTransaction>): Observable<SingleAdvanceFundResponse> {
    return this.http.post<SingleAdvanceFundResponse>(`${this.apiUrl}/${id}/payouts`, payoutData);
  }

  // DELETE: Delete single payout transaction
  deletePayout(id: string, payoutId: string): Observable<AdvanceFundEntry> {
    return this.http
      .delete<SingleAdvanceFundResponse>(`${this.apiUrl}/${id}/payouts/${payoutId}`)
      .pipe(map((res) => res.data));
  }

  // DELETE: Delete advance fund entry
  deleteAdvanceFund(id: string): Observable<boolean> {
    return this.http
      .delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`)
      .pipe(map((res) => res.success));
  }
}
