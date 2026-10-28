import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const isApiRequest = request.url === environment.apiBaseUrl
    || request.url.startsWith(`${environment.apiBaseUrl}/`)
    || request.url.startsWith(`${environment.apiBaseUrl}?`);

  if (!isApiRequest) {
    return next(request);
  }

  const accessToken = authService.getAccessToken();
  const headers = accessToken
    ? request.headers.set('Authorization', `Bearer ${accessToken}`)
    : request.headers;
  const authenticatedRequest = request.clone({ headers, withCredentials: true });

  if (isLoginOrRefreshRequest(request.url)) {
    return next(authenticatedRequest);
  }

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      return authService.refreshAccessToken().pipe(
        switchMap((newAccessToken) => {
          const retryRequest = request.clone({
            headers: request.headers.set('Authorization', `Bearer ${newAccessToken}`),
            withCredentials: true
          });
          return next(retryRequest);
        }),
        catchError((refreshError: unknown) => {
          authService.clearSession();
          void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
          return throwError(() => refreshError);
        })
      );
    })
  );
};

function isLoginOrRefreshRequest(url: string): boolean {
  return url.endsWith('/api/auth/login')
    || url.endsWith('/api/auth/register')
    || url.endsWith('/api/auth/refresh')
    || url.endsWith('/api/auth/logout');
}
