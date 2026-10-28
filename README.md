# Northstar authentication workspace

Angular 21 standalone application with separate login, registration, and dashboard pages. All TypeScript, HTML, and SCSS are kept in separate files.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm start
```

The app runs at `http://localhost:4200` and uses `http://localhost:3000` as its API base URL in all environments.

## Environment builds

```bash
npm run build                 # production
npm run build:development
npm run build:uat
npm run build:production
```

The corresponding serve configurations are `npm start`, `npm run start:uat`, and `npm run start:production`.

## Authentication API contract

The app uses the documented login and current-user routes:

- `POST /api/auth/login` with `{ "email": "...", "password": "..." }`
- `POST /api/auth/register` with `{ "fullName": "...", "email": "...", "password": "..." }`
- `GET /api/users/me` with a bearer access token
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all` with a bearer access token

Successful login and refresh responses must include a non-empty `accessToken`. The profile endpoint returns the signed-in user's profile. Access tokens are held only in application memory; a page reload obtains a new access token through the refresh endpoint.

### Required refresh-cookie behavior

This client expects the API to set and rotate the refresh token in a `Secure`, `HttpOnly`, appropriately `SameSite` cookie on login and refresh. It sends credentialed requests to the API; Angular never reads the refresh cookie or sends a refresh token in a JSON body. The API must accept that cookie on refresh and logout requests. Configure CORS to allow the exact frontend origin and credentials, and configure the development cookie attributes to work on localhost.

The current Swagger definition documents `refreshToken` in the refresh/logout JSON bodies instead. That contract must be updated on the API before refresh/logout will work with this secure cookie-based client. The app intentionally follows the selected HttpOnly-cookie contract rather than exposing the token to JavaScript.

Registration uses the Swagger-defined `fullName`, `email`, and `password` request body; password confirmation is validated in the browser and is not sent to the API.

## Refresh behavior

The auth interceptor adds the in-memory bearer token to API calls, includes credentials, and retries a failed request once after a shared refresh request. If refresh fails, the in-memory session is cleared and the user is sent to sign in. The dashboard route also attempts cookie-based session restoration when opened without an in-memory access token.
