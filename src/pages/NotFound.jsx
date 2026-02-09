import { Link } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";

export default function NotFound() {
  return (
    <div className="notfound-page">
      <style>{`
        .notfound-page {
          background: #0a0a0f;
          min-height: 100vh;
          color: #ffffff;
          overflow-x: hidden;
          font-family: 'Inter', -apple-system, sans-serif;
          display: flex;
          flex-direction: column;
        }

        .notfound-section {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 120px 20px 80px;
          position: relative;
          text-align: center;
        }

        .notfound-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(ellipse 60% 40% at 50% 30%, rgba(16, 185, 129, 0.06) 0%, transparent 60%);
        }

        .notfound-content {
          position: relative;
          z-index: 1;
          max-width: 520px;
        }

        .notfound-code {
          font-size: clamp(5rem, 12vw, 8rem);
          font-weight: 900;
          letter-spacing: -0.04em;
          line-height: 1;
          margin-bottom: 16px;
          background: linear-gradient(135deg, #10b981, #34d399, #6ee7b7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .notfound-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .notfound-desc {
          font-size: 1.05rem;
          color: rgba(255,255,255,0.5);
          line-height: 1.7;
          margin-bottom: 40px;
        }

        .notfound-buttons {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .notfound-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 28px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          font-weight: 700;
          font-size: 0.95rem;
          border-radius: 12px;
          text-decoration: none;
          transition: all 0.3s;
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.3);
        }

        .notfound-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 50px rgba(16, 185, 129, 0.5);
        }

        .notfound-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 28px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          font-weight: 600;
          font-size: 0.95rem;
          border-radius: 12px;
          text-decoration: none;
          transition: all 0.3s;
        }

        .notfound-btn-secondary:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.2);
          transform: translateY(-2px);
        }
      `}</style>

      <PublicNav />

      <section className="notfound-section">
        <div className="notfound-content">
          <div className="notfound-code">404</div>
          <h1 className="notfound-title">Page not found</h1>
          <p className="notfound-desc">
            The page you are looking for does not exist or has been moved. Head
            back home or contact us if you need help.
          </p>
          <div className="notfound-buttons">
            <Link to="/" className="notfound-btn-primary">
              <Home size={18} />
              Back to Home
            </Link>
            <Link to="/contact" className="notfound-btn-secondary">
              <ArrowLeft size={18} />
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
