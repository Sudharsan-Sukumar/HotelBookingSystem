export const environment = {
  production: false,
  apiUrl: 'http://localhost:5031/api',
  // Google OAuth Client ID — a public identifier (Google's flow relies on this being visible in the
  // frontend), not a secret. No client secret is ever used here: Google Identity Services hands this
  // app a signed ID token directly, which the backend verifies against Google's own public keys.
  // Configure a real value from Google Cloud Console > Credentials > OAuth Client ID (Web application),
  // with this origin (e.g. http://localhost:4200) added under Authorized JavaScript origins.
  googleClientId: ''
};
