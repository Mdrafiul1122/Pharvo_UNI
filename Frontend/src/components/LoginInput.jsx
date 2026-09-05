/**
 * Reusable labeled text input with inline validation.
 *
 * @param {string}   id            - input id and label association
 * @param {string}   name          - form field name
 * @param {string}   label         - visible label text
 * @param {string}   [type]        - input type
 * @param {string}   placeholder   - placeholder text
 * @param {string}   [autoComplete]
 * @param {boolean}  [required]
 * @param {string}   error         - inline validation message ("" = valid)
 * @param {string}   value
 * @param {Function} onChange
 * @param {ReactNode} [rightElement] - optional element rendered inside the control
 *                                     (e.g. the password visibility toggle)
 */
export default function LoginInput({
  id,
  name,
  label,
  type = "text",
  placeholder = "",
  autoComplete = "off",
  required = false,
  error = "",
  value,
  onChange,
  rightElement = null,
}) {
  return (
    <div
      className={`field${rightElement ? " field--with-toggle" : ""}${
        error ? " field--invalid" : ""
      }`}
    >
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="field__control">
        <input
          className="field__input"
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          value={value}
          onChange={onChange}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {rightElement}
      </div>
      <p className="field__error" id={`${id}-error`} role="alert">
        {error}
      </p>
    </div>
  );
}
