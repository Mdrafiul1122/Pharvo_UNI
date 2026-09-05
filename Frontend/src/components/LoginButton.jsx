/**
 * Full-width submit button with an accessible loading state.
 *
 * @param {boolean} loading - shows a spinner and disables the button
 */
export default function LoginButton({
  id = "sign-in-btn",
  type = "submit",
  label = "Sign In",
  loadingLabel = "Signing in...",
  loading = false,
}) {
  return (
    <button
      className={`btn${loading ? " btn--loading" : ""}`}
      type={type}
      id={id}
      disabled={loading}
    >
      <svg className="btn__spinner" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="2.5"
        />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="btn__label">{loading ? loadingLabel : label}</span>
    </button>
  );
}
