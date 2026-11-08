const MESSAGES = {
  'auth/invalid-email': 'That email address is not valid.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/email-already-in-use': 'An account with that email address already exists.',
  'auth/weak-password': 'Use a password with at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/requires-recent-login': 'Please sign in again to continue.',
};

export const firebaseErrorMessage = (error) =>
  MESSAGES[error?.code] ?? error?.message ?? 'Something went wrong. Please try again.';
