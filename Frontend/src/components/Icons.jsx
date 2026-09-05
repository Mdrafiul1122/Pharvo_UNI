function Svg({ className = "", children, ...rest }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function LogoMark({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      role="img"
      aria-label="PHARVO logo"
      focusable="false"
    >
      <rect className="logo__tile" x="1" y="1" width="38" height="38" rx="11" />
      <rect className="logo__cross" x="16.7" y="7.5" width="6.6" height="25" rx="3.3" />
      <rect className="logo__cross" x="7.5" y="16.7" width="25" height="6.6" rx="3.3" />
    </svg>
  );
}

export function EyeIcon({ className = "field__icon" }) {
  return (
    <Svg className={className}>
      <path
        d="M1.5 12S5.5 5.5 12 5.5 22.5 12 22.5 12 18.5 18.5 12 18.5 1.5 12 1.5 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </Svg>
  );
}

export function EyeOffIcon({ className = "field__icon" }) {
  return (
    <Svg className={className}>
      <path
        d="M4 4l16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10.6 6.1A9.8 9.8 0 0 1 12 6c6.5 0 10.5 6 10.5 6a17 17 0 0 1-2.6 3.3M6.7 7A16.6 16.6 0 0 0 1.5 12S5.5 18 12 18a9.6 9.6 0 0 0 2.9-.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function AlertIcon({ className = "" }) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 7.5v5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.4" r="1" fill="currentColor" />
    </Svg>
  );
}

export function CheckIcon({ className = "" }) {
  return (
    <Svg className={className}>
      <path
        d="m6 12.5 4 4 8-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ShieldCheckIcon({ className = "" }) {
  return (
    <Svg className={className}>
      <path
        d="M12 2 4 5.5v5.4c0 4.9 3.4 9.4 8 10.6 4.6-1.2 8-5.7 8-10.6V5.5L12 2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m8.8 12 2.2 2.2 4.2-4.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PillIcon({ className = "" }) {
  return (
    <Svg className={className}>
      <path
        d="M8 7.5h8a4.5 4.5 0 0 1 0 9H8a4.5 4.5 0 0 1 0-9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M12 7.5v9" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </Svg>
  );
}

export function LayersIcon({ className = "" }) {
  return (
    <Svg className={className}>
      <path
        d="m12 3 9 5-9 5-9-5 9-5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m3 13 9 5 9-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function RoleBadgeIcon({ className = "role-badge__icon" }) {
  return (
    <Svg className={className}>
      <rect
        x="4"
        y="8"
        width="16"
        height="9"
        rx="4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="M4 12.5h16" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </Svg>
  );
}

export function ProductsIcon({ className = "" }) {
  return (
    <Svg className={className}>
      <path
        d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M3 7.5 12 12l9-4.5M12 12v9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function UsersIcon({ className = "" }) {
  return (
    <Svg className={className}>
      <circle cx="9" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M3.5 19c.6-3 2.9-4.5 5.5-4.5s4.9 1.5 5.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M15.5 4.7a3.2 3.2 0 0 1 0 6.6M18 14.6c1.6.8 2.6 2.3 2.9 4.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function TruckIcon({ className = "" }) {
  return (
    <Svg className={className}>
      <path
        d="M2.5 6.5h11v10h-11z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 9.5h4l3 3v4h-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="6.5" cy="17.5" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="16.5" cy="17.5" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </Svg>
  );
}

export function ReceiptIcon({ className = "" }) {
  return (
    <Svg className={className}>
      <path
        d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21V3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9 8h6M9 12h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function CashIcon({ className = "" }) {
  return (
    <Svg className={className}>
      <rect
        x="2.5"
        y="6"
        width="19"
        height="12"
        rx="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M6 9.5v.01M18 14.5v.01"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function AlertTriangleIcon({ className = "" }) {
  return (
    <Svg className={className}>
      <path
        d="M10.3 4.3 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M12 9.5V13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="15.8" r="1" fill="currentColor" />
    </Svg>
  );
}

export function CalendarIcon({ className = "" }) {
  return (
    <Svg className={className}>
      <rect
        x="3.5"
        y="5"
        width="17"
        height="16"
        rx="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M3.5 9.5h17M8 3v4M16 3v4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ClockIcon({ className = "" }) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 7v5l3.2 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function LogoutIcon({ className = "" }) {
  return (
    <Svg className={className}>
      <path
        d="M14 4h-8a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 6 20h8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 9.5 19.5 12 16 14.5M19 12h-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function RefreshIcon({ className = "" }) {
  return (
    <Svg className={className}>
      <path
        d="M20 12a8 8 0 1 1-2.5-5.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M20 3.5V7h-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
