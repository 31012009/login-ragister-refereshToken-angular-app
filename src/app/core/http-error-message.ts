import { HttpErrorResponse } from '@angular/common/http';

export function getHttpErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof HttpErrorResponse && typeof error.error?.message === 'string') {
    return error.error.message;
  }

  if (error instanceof HttpErrorResponse && error.status === 0) {
    return 'The server could not be reached. Check your connection and try again.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}
