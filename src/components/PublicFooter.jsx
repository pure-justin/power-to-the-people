import { Link } from "react-router-dom";
import { Sun } from "lucide-react";

export default function PublicFooter() {
  return (
    <>
      <style>{`
        .pf-footer {
          padding: 60px 0 40px;
          background: #050508;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .pf-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 48px;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 40px 40px;
        }

        .pf-brand {
          max-width: 300px;
        }

        .pf-brand-name {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 800;
          font-size: 1.1rem;
          color: #fff;
          margin-bottom: 12px;
        }

        .pf-brand-desc {
          color: rgba(255,255,255,0.4);
          font-size: 0.85rem;
          line-height: 1.7;
        }

        .pf-col-title {
          font-weight: 700;
          font-size: 0.85rem;
          color: rgba(255,255,255,0.8);
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .pf-col-links {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .pf-col-links a {
          color: rgba(255,255,255,0.4);
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.2s;
        }

        .pf-col-links a:hover {
          color: #10b981;
        }

        .pf-bottom {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px 40px 0;
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .pf-copy {
          color: rgba(255,255,255,0.25);
          font-size: 0.8rem;
        }

        .pf-social {
          display: flex;
          gap: 16px;
        }

        .pf-social a {
          color: rgba(255,255,255,0.3);
          text-decoration: none;
          font-size: 0.8rem;
          transition: color 0.2s;
        }

        .pf-social a:hover {
          color: #10b981;
        }

        @media (max-width: 1024px) {
          .pf-grid {
            grid-template-columns: 1fr 1fr;
            gap: 32px;
          }
        }

        @media (max-width: 768px) {
          .pf-grid {
            grid-template-columns: 1fr;
            gap: 24px;
            padding: 0 20px 32px;
          }

          .pf-bottom {
            flex-direction: column;
            gap: 16px;
            text-align: center;
            padding: 24px 20px 0;
          }
        }
      `}</style>

      <footer className="pf-footer">
        <div className="pf-grid">
          <div className="pf-brand">
            <div className="pf-brand-name">
              <Sun size={20} style={{ color: "#10b981" }} />
              SolarOS
            </div>
            <p className="pf-brand-desc">
              The operating system for solar installation. Automating the full
              lifecycle from lead to interconnection for homeowners, installers,
              and sales teams nationwide.
            </p>
          </div>

          <div>
            <h4 className="pf-col-title">Product</h4>
            <ul className="pf-col-links">
              <li>
                <Link to="/features">Features</Link>
              </li>
              <li>
                <Link to="/pricing">Pricing</Link>
              </li>
              <li>
                <Link to="/api-docs">API Docs</Link>
              </li>
              <li>
                <Link to="/compare">Comparisons</Link>
              </li>
              <li>
                <Link to="/marketplace/credits">Credit Marketplace</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="pf-col-title">Company</h4>
            <ul className="pf-col-links">
              <li>
                <Link to="/about">About</Link>
              </li>
              <li>
                <Link to="/contact">Contact</Link>
              </li>
              <li>
                <Link to="/solar">Solar by State</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="pf-col-title">Get Started</h4>
            <ul className="pf-col-links">
              <li>
                <Link to="/get-started">Sign Up</Link>
              </li>
              <li>
                <Link to="/login">Sign In</Link>
              </li>
              <li>
                <Link to="/qualify">Check Eligibility</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pf-bottom">
          <p className="pf-copy">
            &copy; {new Date().getFullYear()} SolarOS. All rights reserved.
          </p>
          <div className="pf-social">
            <a
              href="https://twitter.com/solarios"
              target="_blank"
              rel="noopener noreferrer"
            >
              Twitter
            </a>
            <a
              href="https://linkedin.com/company/solarios"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
            <a
              href="https://github.com/solarios"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
