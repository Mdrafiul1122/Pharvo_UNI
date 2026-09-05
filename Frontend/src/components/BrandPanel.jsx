import Logo from "./Logo";
import { ShieldCheckIcon, PillIcon, LayersIcon } from "./Icons";

const FEATURES = [
  { icon: ShieldCheckIcon, text: "Secure role-based access" },
  { icon: PillIcon, text: "Intelligent medicine safety" },
  { icon: LayersIcon, text: "Simplified pharmacy operations" },
];

/**
 * Left branding panel shown on desktop (hidden on small screens).
 */
export default function BrandPanel() {
  return (
    <aside className="brand-panel" aria-label="About PHARVO">
      <div className="brand-panel__bg" aria-hidden="true">
        <svg className="brand-panel__cross" viewBox="0 0 200 200" focusable="false">
          <rect x="88" y="20" width="24" height="160" rx="12" />
          <rect x="20" y="88" width="160" height="24" rx="12" />
        </svg>
        <span className="brand-panel__dot brand-panel__dot--1" />
        <span className="brand-panel__dot brand-panel__dot--2" />
        <span className="brand-panel__dot brand-panel__dot--3" />
      </div>

      <div className="brand-panel__top">
        <Logo />
      </div>

      <div className="brand-panel__content">
        <span className="brand-panel__eyebrow">Pharmacy Management</span>
        <h1 className="brand-panel__statement">
          Smarter pharmacy operations, safer medicine management.
        </h1>

        <ul className="feature-list" role="list">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li className="feature-list__item" key={text}>
              <span className="feature-list__icon">
                <Icon />
              </span>
              <span className="feature-list__text">{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
