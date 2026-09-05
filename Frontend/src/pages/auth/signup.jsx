import { useState } from "react";
import Logo from "../../components/Logo";
import BrandPanel from "../../components/BrandPanel";
import LoginInput from "../../components/LoginInput";
import PasswordInput from "../../components/PasswordInput";
import LoginButton from "../../components/LoginButton";
import { AlertIcon, RoleBadgeIcon } from "../../components/Icons";
import { signupUser, roleHomePath } from "../../services/auth";

const MIN_PASSWORD_LENGTH = 6;

const ROLE_OPTIONS = [
  {
    value: "pharmacist",
    label: "Pharmacist",
    hint: "Manage inventory, sales and pharmacy operations",
  },
  {
    value: "customer",
    label: "Customer",
    hint: "Track your purchases and customer profile",
  },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateField(value) {
  return value.trim() ? "" : "This field is required.";
}

function validateEmail(value) {
  const base = validateField(value);
  if (base) {
    return base;
  }
  return EMAIL_PATTERN.test(value.trim()) ? "" : "Enter a valid email address.";
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

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("");
  const [errors, setErrors] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
  });
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

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
      fullName: validateField(fullName),
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: validateField(confirmPassword),
      role: role ? "" : "Select a role.",
    };
    if (!nextErrors.password && password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);
    setFormError("");

    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    setLoading(true);

    try {
      const data = await signupUser({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        confirm_password: confirmPassword,
        role,
      });
      window.location.assign(roleHomePath(data.user?.role ?? role));
    } catch (err) {
      setFormError(err?.message || "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <BrandPanel />

      <main className="form-panel">
        <section className="login-card login-card--signup" aria-labelledby="signup-title">
          <div className="login-card__logo">
            <Logo className="logo logo--card" compact />
          </div>

          <header className="login-card__header">
            <h2 className="login-card__title" id="signup-title">
              Create your account
            </h2>
            <p className="login-card__subtitle">Join PHARVO in a few steps</p>
          </header>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {formError && (
              <div className="form-alert" role="alert">
                <AlertIcon />
                <span>{formError}</span>
              </div>
            )}

            <LoginInput
              id="full-name"
              name="full_name"
              label="Full Name"
              placeholder="Enter your full name"
              type="text"
              autoComplete="name"
              required
              error={errors.fullName}
              value={fullName}
              onChange={(event) => {
                setFullName(event.target.value);
                clearFieldError("fullName");
              }}
            />

            <LoginInput
              id="email"
              name="email"
              label="Email"
              placeholder="Enter your email"
              type="email"
              autoComplete="email"
              required
              error={errors.email}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                clearFieldError("email");
              }}
            />

            <PasswordInput
              id="password"
              name="password"
              label="Password"
              placeholder="Create a password"
              autoComplete="new-password"
              error={errors.password}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                clearFieldError("password");
              }}
            />

            <PasswordInput
              id="confirm-password"
              name="confirm_password"
              label="Confirm Password"
              placeholder="Re-enter your password"
              autoComplete="new-password"
              error={errors.confirmPassword}
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                clearFieldError("confirmPassword");
              }}
            />

            <div className={`field${errors.role ? " field--invalid" : ""}`}>
              <span className="field__label" id="role-label">
                I am a
              </span>
              <div className="role-select" role="radiogroup" aria-labelledby="role-label">
                {ROLE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`role-select__option${
                      role === option.value ? " is-active" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={option.value}
                      checked={role === option.value}
                      onChange={() => {
                        setRole(option.value);
                        clearFieldError("role");
                      }}
                    />
                    <span className="role-select__badge" aria-hidden="true">
                      <RoleBadgeIcon />
                    </span>
                    <span className="role-select__body">
                      <span className="role-select__label">{option.label}</span>
                      <span className="role-select__hint">{option.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="field__error" id="role-error" role="alert">
                {errors.role}
              </p>
            </div>

            <LoginButton
              id="sign-up-btn"
              label="Create Account"
              loadingLabel="Creating account..."
              loading={loading}
            />

            <p className="login-form__prompt">
              Already have an account?{" "}
              <a className="login-form__link" href="/">
                Sign in
              </a>
            </p>
          </form>
        </section>
      </main>
    </div>
  );
}