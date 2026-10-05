import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, tap, catchError } from 'rxjs';
import { UserProfile } from '../models/customer.model';
import { UserProfileService } from './user-profile.service';
import { environment } from '../../environments/environment';

const AUTH_TOKEN_KEY = 'dd_finserve_auth_token';
const AUTH_USER_KEY = 'dd_finserve_auth_user';

export interface LoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: UserProfile;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private profileService = inject(UserProfileService);

  private apiUrl = `${environment.apiUrl}/auth`;

  private isLoggedInSubject = new BehaviorSubject<boolean>(this.hasValidToken());
  public isLoggedIn$: Observable<boolean> = this.isLoggedInSubject.asObservable();

  private currentUserSubject = new BehaviorSubject<UserProfile | null>(this.getStoredUser());
  public currentUser$: Observable<UserProfile | null> = this.currentUserSubject.asObservable();

  constructor() {}

  private hasValidToken(): boolean {
    return !!localStorage.getItem(AUTH_TOKEN_KEY);
  }

  private getStoredUser(): UserProfile | null {
    try {
      const data = localStorage.getItem(AUTH_USER_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  }

  isLoggedIn(): boolean {
    return this.isLoggedInSubject.getValue();
  }

  isAdmin(): boolean {
    return this.profileService.isAdmin();
  }

  get currentUser(): UserProfile | null {
    return this.currentUserSubject.getValue();
  }

  login(credentials: { email: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((res) => {
        if (res.success && res.token && res.user) {
          this.setSession(res.token, res.user);
        }
      })
    );
  }

  private setSession(token: string, user: UserProfile): void {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));

    this.isLoggedInSubject.next(true);
    this.currentUserSubject.next(user);

    // Sync with UserProfileService
    this.profileService.updateProfile(user);
  }

  logout(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);

    this.isLoggedInSubject.next(false);
    this.currentUserSubject.next(null);

    this.router.navigate(['/login']);
  }
}
