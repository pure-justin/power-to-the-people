import { useState } from "react";
import { Link } from "react-router-dom";
import { Sun, ArrowRight, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export default function PublicNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <style>{`
        .pn-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          padding: 16px 0;
          background: rgba(10, 10, 15, 0.8);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .pn-header .pn-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .pn-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 800;
          font-size: 1.25rem;
          color: #fff;
          text-decoration: none;
          letter-spacing: -0.02em;
        }

        .pn-logo-icon {
          width: 38px;
          height: 38px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 24px rgba(16, 185, 129, 0.4);
        }

        .pn-nav {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pn-nav-link {
          color: rgba(255,255,255,0.6);
          text-decoration: none;
          font-weight: 500;
          font-size: 0.9rem;
          transition: all 0.3s;
          padding: 8px 16px;
          border-radius: 8px;
        }

        .pn-nav-link:hover {
          color: #fff;
          background: rgba(255,255,255,0.05);
        }

        .pn-nav-cta {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          font-weight: 600;
          font-size: 0.9rem;
          border-radius: 10px;
          text-decoration: none;
          transition: all 0.3s;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
        }

        .pn-nav-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.5);
          background: linear-gradient(135deg, #34d399, #10b981);
        }

        .pn-hamburger {
          display: none;
          background: none;
          border: none;
          color: rgba(255,255,255,0.7);
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .pn-hamburger:hover {
          color: #fff;
          background: rgba(255,255,255,0.05);
        }

        /* Mobile drawer */
        .pn-mobile-overlay {
          display: none;
          position: fixed;
          inset: 0;
          z-index: 200;
          background: rgba(0,0,0,0.6);
        }

        .pn-mobile-overlay.open {
          display: block;
        }

        .pn-mobile-drawer {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 280px;
          z-index: 201;
          background: #111118;
          border-left: 1px solid rgba(255,255,255,0.08);
          padding: 24px;
          transform: translateX(100%);
          transition: transform 0.3s ease;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .pn-mobile-drawer.open {
          transform: translateX(0);
        }

        .pn-mobile-close {
          align-self: flex-end;
          background: none;
          border: none;
          color: rgba(255,255,255,0.5);
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .pn-mobile-close:hover {
          color: #fff;
          background: rgba(255,255,255,0.05);
        }

        .pn-mobile-link {
          display: block;
          color: rgba(255,255,255,0.7);
          text-decoration: none;
          font-weight: 500;
          font-size: 1rem;
          padding: 12px 16px;
          border-radius: 10px;
          transition: all 0.2s;
        }

        .pn-mobile-link:hover {
          color: #fff;
          background: rgba(255,255,255,0.05);
        }

        .pn-mobile-cta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 16px;
          padding: 14px 24px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          font-weight: 600;
          font-size: 0.95rem;
          border-radius: 12px;
          text-decoration: none;
          box-shadow: 0 0 24px rgba(16, 185, 129, 0.3);
        }

        @media (max-width: 768px) {
          .pn-header .pn-container {
            padding: 0 20px;
          }

          .pn-nav-link, .pn-nav-cta {
            display: none;
          }

          .pn-hamburger {
            display: block;
          }
        }
      `}</style>

      <header className="pn-header">
        <div className="pn-container">
          <Link to="/" className="pn-logo">
            <div className="pn-logo-icon">
              <Sun size={20} />
            </div>
            SolarOS
          </Link>
          <nav className="pn-nav">
            {NAV_LINKS.map((link) => (
              <Link key={link.to} to={link.to} className="pn-nav-link">
                {link.label}
              </Link>
            ))}
            <Link to="/login" className="pn-nav-link">
              Sign In
            </Link>
            <Link to="/get-started" className="pn-nav-cta">
              Get Started
              <ArrowRight size={16} />
            </Link>
          </nav>
          <button
            className="pn-hamburger"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={`pn-mobile-overlay ${mobileOpen ? "open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />
      <div className={`pn-mobile-drawer ${mobileOpen ? "open" : ""}`}>
        <button
          className="pn-mobile-close"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X size={24} />
        </button>
        {NAV_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="pn-mobile-link"
            onClick={() => setMobileOpen(false)}
          >
            {link.label}
          </Link>
        ))}
        <Link
          to="/login"
          className="pn-mobile-link"
          onClick={() => setMobileOpen(false)}
        >
          Sign In
        </Link>
        <Link
          to="/get-started"
          className="pn-mobile-cta"
          onClick={() => setMobileOpen(false)}
        >
          Get Started
          <ArrowRight size={16} />
        </Link>
      </div>
    </>
  );
}
