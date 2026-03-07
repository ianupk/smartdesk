"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const ERROR_MESSAGES: Record<string, string> = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "You do not have permission to sign in.",
  Verification: "The sign in link is no longer valid.",
  OAuthSignin: "Could not start the OAuth sign-in flow.",
  OAuthCallback: "Could not complete the OAuth sign-in.",
  OAuthCreateAccount: "Could not create an OAuth account.",
  EmailCreateAccount: "Could not create an email account.",
  Callback: "Could not complete the sign-in callback.",
  OAuthAccountNotLinked: "This email is already linked to another sign-in method.",
  Default: "An unexpected error occurred during sign in.",
};

export default function AuthErrorPage() {
  const params = useSearchParams();
  const errorCode = params?.get("error") ?? "Default";
  const message = ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.Default;

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-sm animate-slide-up">
        <div className="w-12 h-12 rounded-2xl bg-danger/10 border border-danger/30 flex items-center justify-center text-2xl mx-auto">
          ✗
        </div>
        <h1 className="font-display text-2xl font-bold text-ink">Sign-in Error</h1>
        <p className="text-sm text-ink-muted">{message}</p>

        {/* Show raw error code for debugging */}
        {errorCode && (
          <p className="text-xs font-mono bg-surface-2 border border-border rounded px-3 py-2 text-ink-muted">
            Error code: {errorCode}
          </p>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <Link
            href="/login"
            className="btn-primary justify-center"
          >
            ← Back to login
          </Link>
          <Link
            href="/register"
            className="btn-secondary justify-center"
          >
            Create a new account
          </Link>
        </div>
      </div>
    </div>
  );
}
