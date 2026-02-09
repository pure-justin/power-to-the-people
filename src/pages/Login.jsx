import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { linkGoogleToExistingAccount } from "../services/firebase";
import { Sun } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [linkingAccount, setLinkingAccount] = useState(false);
  const [pendingCred, setPendingCred] = useState(null);
  const { login, loginWithGoogle, resetPassword, getRedirectPath } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (linkingAccount && pendingCred) {
        // User is providing password to link their Google account
        await linkGoogleToExistingAccount(email, password, pendingCred);
        setLinkingAccount(false);
        setPendingCred(null);
      } else {
        await login(email, password);
      }
      navigate(getRedirectPath());
    } catch (err) {
      setError(
        err.code === "auth/wrong-password" ||
          err.code === "auth/invalid-credential"
          ? "Invalid password. Please try again."
          : err.message?.includes("auth/")
            ? "Invalid email or password"
            : err.message,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate(getRedirectPath());
    } catch (err) {
      if (err.code === "auth/popup-closed-by-user") {
        // User closed the popup, no error needed
      } else if (err.code === "auth/account-exists-with-different-credential") {
        // Email already has a password account — prompt to link
        setPendingCred(err.pendingCred);
        setEmail(err.email || "");
        setLinkingAccount(true);
        setError("");
      } else {
        setError(err.message || "Google sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email) {
      setError("Enter your email address first");
      return;
    }
    try {
      await resetPassword(email);
      setResetSent(true);
      setError("");
    } catch {
      setError("Failed to send reset email");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <Sun className="h-10 w-10 text-emerald-500" />
            <span className="text-2xl font-bold text-gray-900">SolarOS</span>
          </Link>
          <p className="mt-2 text-sm text-gray-500">Sign in to your account</p>
        </div>

        {/* Form */}
        <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
          {linkingAccount && (
            <div className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
              An account with <strong>{email}</strong> already exists. Enter
              your password to link your Google account.
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {resetSent && (
            <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
              Password reset email sent. Check your inbox.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field mt-1"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-field mt-1"
                placeholder="Enter your password"
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleReset}
                className="text-sm text-emerald-600 hover:text-emerald-500"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading
                ? "Signing in..."
                : linkingAccount
                  ? "Link Google & Sign in"
                  : "Sign in"}
            </button>
          </form>

          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-gray-200" />
            <span className="px-3 text-sm text-gray-400">or</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="btn-secondary w-full"
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Sign up link */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="font-medium text-emerald-600 hover:text-emerald-500"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
