import { useState } from "react";
import LoginInput from "./LoginInput";
import { EyeIcon, EyeOffIcon } from "./Icons";

/**
 * Password field with an accessible show/hide toggle.
 */
export default function PasswordInput({
  id,
  name,
  label = "Password",
  placeholder = "Enter your password",
  autoComplete = "current-password",
  required = true,
  error = "",
  value,
  onChange,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <LoginInput
      id={id}
      name={name}
      label={label}
      type={visible ? "text" : "password"}
      placeholder={placeholder}
      autoComplete={autoComplete}
      required={required}
      error={error}
      value={value}
      onChange={onChange}
      rightElement={
        <button
          className="field__toggle"
          type="button"
          data-toggle-password={id}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          aria-controls={id}
          onClick={() => setVisible((prev) => !prev)}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      }
    />
  );
}
