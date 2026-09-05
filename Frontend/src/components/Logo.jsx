import { LogoMark } from "./Icons";

/**
 * Reusable PHARVO brand logo.
 *
 * @param {string} className - extra classes for the root element
 * @param {boolean} compact  - when true, hides the subtitle (used on mobile cards)
 */
export default function Logo({ className = "logo", compact = false }) {
  return (
    <span className={`${className}${compact ? " logo--compact" : ""}`}>
      <LogoMark className="logo__mark" />
      <span className="logo__text">
        <span className="logo__name">PHARVO</span>
        <span className="logo__subtitle">Smart Pharmacy Management</span>
      </span>
    </span>
  );
}
