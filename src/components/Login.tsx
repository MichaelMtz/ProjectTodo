import { FormEvent, useState, useCallback } from "react";
import { ConvexError } from "convex/values";
import { useAuth } from "../auth";
import "../styles/login.css";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const togglePassword = useCallback(() => setShowPassword((v) => !v), []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    try {
      if (flow === "signIn") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err) {
      const fallback =
        flow === "signIn" ? "Could not sign in." : "Could not sign up.";
      setError(
        err instanceof ConvexError ? String(err.data) : fallback,
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-logo">✶</span>
          <h1>
            Project AI Chat <span className="login-accent">TodoNotes</span>
          </h1>
        </div>
        <p className="login-sub">Track your project, phase by phase.</p>

        <form onSubmit={handleSubmit} className="login-form">
          <label className="login-label">Email</label>
          <input
            className="input"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
          <label className="login-label">Password</label>
          <div className="password-field">
            <input
              className="input"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={flow === "signIn" ? "current-password" : "new-password"}
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={togglePassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {error && <div className="login-error">{error}</div>}

          <button className="btn btn--primary login-submit" type="submit" disabled={submitting}>
            {submitting ? "…" : flow === "signIn" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="login-switch">
          {flow === "signIn" ? "New here?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="login-link"
            onClick={() => {
              setError(null);
              setFlow(flow === "signIn" ? "signUp" : "signIn");
            }}
          >
            {flow === "signIn" ? "Create an account" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
