import { useState } from "react";
import Logo from "../../components/Logo";
import BrandPanel from "../../components/BrandPanel";
import LoginInput from "../../components/LoginInput";
import PasswordInput from "../../components/PasswordInput";
import LoginButton from "../../components/LoginButton";
import { AlertIcon } from "../../components/Icons";
import { loginUser, roleHomePath } from "../../services/auth";

const MIN_PASSWORD_LENGTH = 6;

const DEMO_USERNAME = "rafi";
const DEMO_PASSWORD = "787878";

function validateUsername(value) {
  if (!value.trim()) {
    return "Email or username is required.";
  }
  return "";
}

function validatePassword(value) {
  if (!value) {
    return "Password is required.";
  }
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return "";
}

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({ username: "", password: "" });
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  function fallbackCopy(text, onDone) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      onDone();
    } catch {
      // ignore — the copy button just won't work in this browser
    }
    document.body.removeChild(textarea);
  }

  function handleCopyDemo() {
    const text = `Username: ${DEMO_USERNAME}\nPassword: ${DEMO_PASSWORD}`;
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  function clearFieldError(field) {
    setErrors((prev) => ({ ...prev, [field]: "" }));
    if (formError) {
      setFormError("");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) {
      return;
    }

    const nextErrors = {
      username: validateUsername(username),
      password: validatePassword(password),
    };

    setErrors(nextErrors);
    setFormError("");

    if (nextErrors.username || nextErrors.password) {
      return;
    }

    setLoading(true);

    try {
      const data = await loginUser({
        username: username.trim(),
        password,
      });
      window.location.assign(roleHomePath(data.user?.role));
    } catch (err) {
      setFormError(err?.message || "Invalid username or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <BrandPanel />

      <main className="form-panel">
        <section className="login-card" aria-labelledby="login-title">
          <div className="login-card__logo">
            <Logo className="logo logo--card" compact />
          </div>

          <header className="login-card__header">
            <h2 className="login-card__title" id="login-title">
              Welcome back
            </h2>
            <p className="login-card__subtitle">Sign in to your Pharmacist account</p>
          </header>

          <section className="demo-login" aria-label="Demo login credentials">
            <div className="demo-login__title">
              <span>Demo Login</span>
              <button type="button" className="demo-login__copy" onClick={handleCopyDemo}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="demo-login__row">
              <span className="demo-login__row-label">Username</span>
              <span className="demo-login__row-value">{DEMO_USERNAME}</span>
            </div>
            <div className="demo-login__row">
              <span className="demo-login__row-label">Password</span>
              <span className="demo-login__row-value">{DEMO_PASSWORD}</span>
            </div>
          </section>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {formError && (
              <div className="form-alert" role="alert">
                <AlertIcon />
                <span>{formError}</span>
              </div>
            )}

            <LoginInput
              id="username"
              name="username"
              label="Email or Username"
              placeholder="Enter your email or username"
              type="text"
              autoComplete="username"
              required
              error={errors.username}
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                clearFieldError("username");
              }}
            />

            <PasswordInput
              id="password"
              name="password"
              error={errors.password}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                clearFieldError("password");
              }}
            />

            <LoginButton loading={loading} />

            <p className="login-form__prompt">
              New to PHARVO?{" "}
              <a className="login-form__link" href="/signup">
                Create an account
              </a>
            </p>
          </form>
        </section>
      </main>
    </div>
  );
}