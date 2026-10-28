import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('uses the cookie to refresh and retries unauthorized API requests with the new in-memory token', () => {
    const userResponse = { email: 'person@example.com' };
    let response: typeof userResponse | undefined;

    httpClient.get<typeof userResponse>(`${environment.apiBaseUrl}/api/users/me`).subscribe((value) => {
      response = value;
    });

    const initialRequest = httpTestingController.expectOne(`${environment.apiBaseUrl}/api/users/me`);
    expect(initialRequest.request.withCredentials).toBe(true);
    expect(initialRequest.request.headers.has('Authorization')).toBe(false);
    initialRequest.flush({ message: 'Access token expired.' }, { status: 401, statusText: 'Unauthorized' });

    const refreshRequest = httpTestingController.expectOne(`${environment.apiBaseUrl}/api/auth/refresh`);
    expect(refreshRequest.request.method).toBe('POST');
    expect(refreshRequest.request.body).toBeNull();
    expect(refreshRequest.request.withCredentials).toBe(true);
    refreshRequest.flush({ accessToken: 'rotated-access-token' });

    const retriedRequest = httpTestingController.expectOne(`${environment.apiBaseUrl}/api/users/me`);
    expect(retriedRequest.request.headers.get('Authorization')).toBe('Bearer rotated-access-token');
    expect(retriedRequest.request.withCredentials).toBe(true);
    retriedRequest.flush(userResponse);

    expect(response).toEqual(userResponse);
    expect(authService.getAccessToken()).toBe('rotated-access-token');
  });

  it('shares one refresh request between concurrent unauthorized API requests', () => {
    let userRequestCompleted = false;
    let customersRequestCompleted = false;

    httpClient.get(`${environment.apiBaseUrl}/api/users/me`).subscribe(() => {
      userRequestCompleted = true;
    });
    httpClient.get(`${environment.apiBaseUrl}/api/customers`).subscribe(() => {
      customersRequestCompleted = true;
    });

    httpTestingController
      .expectOne(`${environment.apiBaseUrl}/api/users/me`)
      .flush({ message: 'Access token expired.' }, { status: 401, statusText: 'Unauthorized' });
    httpTestingController
      .expectOne(`${environment.apiBaseUrl}/api/customers`)
      .flush({ message: 'Access token expired.' }, { status: 401, statusText: 'Unauthorized' });

    const refreshRequests = httpTestingController.match(`${environment.apiBaseUrl}/api/auth/refresh`);
    expect(refreshRequests).toHaveLength(1);
    refreshRequests[0].flush({ accessToken: 'shared-access-token' });

    httpTestingController.expectOne(`${environment.apiBaseUrl}/api/users/me`).flush({ email: 'person@example.com' });
    httpTestingController.expectOne(`${environment.apiBaseUrl}/api/customers`).flush([]);

    expect(userRequestCompleted).toBe(true);
    expect(customersRequestCompleted).toBe(true);
  });
});
