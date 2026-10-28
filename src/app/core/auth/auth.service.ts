import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, switchMap, tap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthUser, CurrentUserResponse, LoginRequest, RegisterRequest, TokenResponse } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl;
  private readonly accessTokenState = signal<string | null>(null);
  private readonly currentUserState = signal<AuthUser | null>(null);
  private refreshRequest$: Observable<string> | null = null;

  readonly currentUser = this.currentUserState.asReadonly();
  readonly isAuthenticated = computed(() => this.accessTokenState() !== null);

  login(credentials: LoginRequest): Observable<AuthUser> {
    return this.http
      .post<TokenResponse>(`${this.apiBaseUrl}/api/auth/login`, credentials, { withCredentials: true })
      .pipe(
        map((response) => this.readAccessToken(response)),
        tap((accessToken) => this.accessTokenState.set(accessToken)),
        switchMap(() => this.loadCurrentUser()),
        catchError((error: unknown) => {
          this.clearSession();
          return throwError(() => error);
        })
      );
  }

  register(credentials: RegisterRequest): Observable<void> {
    return this.http.post<void>(
      `${this.apiBaseUrl}/api/auth/register`,
      credentials
    );
  }

  refreshAccessToken(): Observable<string> {
    if (this.refreshRequest$) {
      return this.refreshRequest$;
    }

    this.refreshRequest$ = this.http
      .post<TokenResponse>(`${this.apiBaseUrl}/api/auth/refresh`, null, { withCredentials: true })
      .pipe(
        map((response) => this.readAccessToken(response)),
        tap((accessToken) => this.accessTokenState.set(accessToken)),
        finalize(() => {
          this.refreshRequest$ = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );

    return this.refreshRequest$;
  }

  loadCurrentUser(): Observable<AuthUser> {
    return this.http.get<CurrentUserResponse>(`${this.apiBaseUrl}/api/users/me`).pipe(
      map((response) => response.user),
      tap((user) => this.currentUserState.set(user))
    );
  }

  ensureAuthenticated(): Observable<boolean> {
    if (this.isAuthenticated() && this.currentUser()) {
      return of(true);
    }

    return this.refreshAccessToken().pipe(
      switchMap(() => this.loadCurrentUser()),
      map(() => true),
      catchError((error: unknown) => {
        this.clearSession();
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return of(false);
        }
        return throwError(() => error);
      })
    );
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.apiBaseUrl}/api/auth/logout`, null, { withCredentials: true })
      .pipe(
        catchError((error: unknown) => {
          this.clearSession();
          return throwError(() => error);
        }),
        tap(() => this.clearSession())
      );
  }

  logoutAll(): Observable<void> {
    return this.http
      .post<void>(`${this.apiBaseUrl}/api/auth/logout-all`, null, { withCredentials: true })
      .pipe(
        catchError((error: unknown) => {
          this.clearSession();
          return throwError(() => error);
        }),
        tap(() => this.clearSession())
      );
  }

  clearSession(): void {
    this.accessTokenState.set(null);
    this.currentUserState.set(null);
  }

  getAccessToken(): string | null {
    return this.accessTokenState();
  }

  private readAccessToken(response: TokenResponse): string {
    if (typeof response?.accessToken !== 'string' || response.accessToken.length === 0) {
      throw new Error('The authentication API did not return an access token.');
    }
    return response.accessToken;
  }
}
