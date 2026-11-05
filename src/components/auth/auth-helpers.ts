import { FirebaseError } from "firebase/app";

export const EMAIL_FOR_LINK_KEY = "stubparse:emailForSignIn";

/** Only same-site paths are allowed as a post-sign-in destination. */
export function safeNext(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/app";
}

/** Maps Firebase Auth errors to a sentence that names the problem and the recovery. Empty string = stay silent. */
export function authErrorMessage(err: unknown): string {
  const code = err instanceof FirebaseError ? err.code : "";
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email and password don't match. Try again, or use “Forgot password?”.";
    case "auth/invalid-email":
      return "That doesn't look like an email address. Check it and try again.";
    case "auth/email-already-in-use":
      return "There's already an account with this email. Sign in instead.";
    case "auth/weak-password":
      return "Choose a password with at least 8 characters.";
    case "auth/account-exists-with-different-credential":
      return "This email is already linked to another sign-in method. Use that method instead.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a minute, then try again.";
    case "auth/network-request-failed":
      return "Couldn't reach the sign-in service. Check your connection and try again.";
    case "auth/operation-not-allowed":
      return "This sign-in method isn't turned on yet. Use another option.";
    case "auth/invalid-action-code":
    case "auth/expired-action-code":
      return "This link has expired or was already used. Request a new one.";
    default:
      return "Something went wrong signing you in. Try again.";
  }
}
