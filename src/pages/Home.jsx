import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Zap, Shield, Battery, ArrowRight, Plug, Sun } from "lucide-react";

export default function Home() {
  const [showContent, setShowContent] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    // Show content after a brief delay for dramatic effect
    setTimeout(() => setShowContent(true), 800);
  }, []);

  return (
    <div className="home-page">
      <style>{`
        /* ============================================
           DARK CINEMATIC THEME
           ============================================ */
        .home-page {
          background: #0a0a0f;
          min-height: 100vh;
          color: #ffffff;
          overflow-x: hidden;
        }

        /* Header - Dark Transparent */
        .dark-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          padding: 20px 0;
          background: linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 50%, transparent 100%);
        }

        .dark-header .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .dark-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 800;
          font-size: 1.3rem;
          color: #fff;
          text-decoration: none;
        }

        .dark-logo-icon {
          width: 42px;
          height: 42px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.5);
        }

        .dark-nav {
          display: flex;
          align-items: center;
          gap: 32px;
        }

        .dark-nav-link {
          color: rgba(255,255,255,0.7);
          text-decoration: none;
          font-weight: 500;
          font-size: 0.95rem;
          transition: all 0.3s;
        }

        .dark-nav-link:hover {
          color: #10b981;
        }

        /* ============================================
           VIDEO HERO
           ============================================ */
        .video-hero {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .hero-video-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
        }

        .hero-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        /* Dark overlay for text readability */
        .hero-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.4) 0%,
            rgba(0, 0, 0, 0.2) 40%,
            rgba(0, 0, 0, 0.3) 60%,
            rgba(0, 0, 0, 0.7) 100%
          );
          z-index: 1;
        }

        /* Vignette effect */
        .hero-vignette {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          box-shadow: inset 0 0 200px rgba(0, 0, 0, 0.8);
          z-index: 2;
          pointer-events: none;
        }

        /* Hero Content */
        .hero-content {
          position: relative;
          z-index: 10;
          text-align: center;
          padding: 0 20px;
          max-width: 900px;
        }

        .hero-tagline {
          font-size: clamp(2.5rem, 7vw, 5.5rem);
          font-weight: 800;
          line-height: 1.05;
          margin-bottom: 24px;
          opacity: 0;
          transform: translateY(40px);
          transition: all 1.2s cubic-bezier(0.16, 1, 0.3, 1);
          text-shadow: 0 4px 30px rgba(0, 0, 0, 0.8);
        }

        .hero-tagline.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .hero-tagline .highlight {
          background: linear-gradient(135deg, #10b981, #34d399, #6ee7b7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(0 0 30px rgba(16, 185, 129, 0.5));
        }

        .hero-subtitle {
          font-size: clamp(1.1rem, 2.5vw, 1.5rem);
          color: rgba(255, 255, 255, 0.9);
          max-width: 600px;
          margin: 0 auto 48px;
          opacity: 0;
          transform: translateY(30px);
          transition: all 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.2s;
          text-shadow: 0 2px 20px rgba(0, 0, 0, 0.8);
          font-weight: 400;
        }

        .hero-subtitle.visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* CTA Button */
        .hero-cta {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 20px 44px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          font-weight: 700;
          font-size: 1.15rem;
          border-radius: 14px;
          text-decoration: none;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow:
            0 0 50px rgba(16, 185, 129, 0.4),
            0 10px 40px rgba(0, 0, 0, 0.3);
          opacity: 0;
          transform: translateY(30px);
          animation: fade-in-up 1s cubic-bezier(0.16, 1, 0.3, 1) 0.5s forwards;
        }

        .hero-cta:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow:
            0 0 80px rgba(16, 185, 129, 0.6),
            0 20px 50px rgba(0, 0, 0, 0.4);
        }

        @keyframes fade-in-up {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Scroll indicator */
        .scroll-indicator {
          position: absolute;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          opacity: 0;
          animation: fade-in 1s ease 1.5s forwards, bounce 2s ease-in-out 2s infinite;
        }

        .scroll-indicator span {
          display: block;
          width: 24px;
          height: 40px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-radius: 12px;
          position: relative;
        }

        .scroll-indicator span::before {
          content: '';
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 8px;
          background: rgba(255, 255, 255, 0.6);
          border-radius: 2px;
          animation: scroll-dot 2s ease-in-out infinite;
        }

        @keyframes fade-in {
          to { opacity: 1; }
        }

        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(10px); }
        }

        @keyframes scroll-dot {
          0%, 100% { opacity: 1; top: 8px; }
          50% { opacity: 0.3; top: 18px; }
        }

        /* ============================================
           STATS SECTION
           ============================================ */
        .stats-section {
          padding: 100px 0;
          background: linear-gradient(to bottom, #0a0a0f, #0f1419);
          position: relative;
        }

        .stats-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.3), transparent);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 40px;
          max-width: 1000px;
          margin: 0 auto;
          padding: 0 40px;
        }

        .stat-item {
          text-align: center;
        }

        .stat-value {
          font-size: 3.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, #10b981, #34d399);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 8px;
        }

        .stat-label {
          color: rgba(255,255,255,0.6);
          font-size: 1rem;
          font-weight: 500;
        }

        /* ============================================
           FEATURES SECTION
           ============================================ */
        .dark-features {
          padding: 120px 0;
          background: #0f1419;
          position: relative;
        }

        .section-header {
          text-align: center;
          margin-bottom: 80px;
        }

        .section-title {
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 800;
          margin-bottom: 16px;
        }

        .section-subtitle {
          font-size: 1.2rem;
          color: rgba(255,255,255,0.6);
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 32px;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 40px;
        }

        .feature-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          padding: 40px 32px;
          transition: all 0.4s ease;
        }

        .feature-card:hover {
          transform: translateY(-8px);
          border-color: rgba(16, 185, 129, 0.3);
          box-shadow: 0 20px 60px rgba(0,0,0,0.3), 0 0 40px rgba(16, 185, 129, 0.1);
        }

        .feature-icon {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1));
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          color: #10b981;
        }

        .feature-title {
          font-size: 1.3rem;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .feature-desc {
          color: rgba(255,255,255,0.6);
          line-height: 1.7;
        }

        /* ============================================
           HOW IT WORKS
           ============================================ */
        .how-section {
          padding: 120px 0;
          background: linear-gradient(to bottom, #0f1419, #0a0a0f);
        }

        .process-steps {
          display: flex;
          justify-content: center;
          gap: 60px;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 40px;
          flex-wrap: wrap;
        }

        .process-step {
          flex: 1;
          min-width: 200px;
          max-width: 250px;
          text-align: center;
          position: relative;
        }

        .process-step:not(:last-child)::after {
          content: '';
          position: absolute;
          top: 40px;
          right: -30px;
          width: 60px;
          height: 2px;
          background: linear-gradient(90deg, rgba(16, 185, 129, 0.5), transparent);
        }

        .process-number {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05));
          border: 2px solid rgba(16, 185, 129, 0.3);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.8rem;
          font-weight: 800;
          color: #10b981;
          margin: 0 auto 24px;
        }

        .process-title {
          font-size: 1.2rem;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .process-desc {
          color: rgba(255,255,255,0.6);
          font-size: 0.95rem;
          line-height: 1.6;
        }

        /* ============================================
           FINAL CTA
           ============================================ */
        .final-cta {
          padding: 140px 0;
          text-align: center;
          background:
            radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, 0.15) 0%, transparent 50%),
            #0a0a0f;
        }

        .cta-title {
          font-size: clamp(2rem, 5vw, 3.5rem);
          font-weight: 800;
          margin-bottom: 20px;
        }

        .cta-subtitle {
          font-size: 1.2rem;
          color: rgba(255,255,255,0.6);
          margin-bottom: 40px;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }

        /* ============================================
           FOOTER
           ============================================ */
        .dark-footer {
          padding: 40px 0;
          border-top: 1px solid rgba(255,255,255,0.1);
          background: #050508;
        }

        .dark-footer .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .footer-links {
          display: flex;
          gap: 32px;
        }

        .footer-link {
          color: rgba(255,255,255,0.5);
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.3s;
        }

        .footer-link:hover {
          color: #10b981;
        }

        .footer-copy {
          color: rgba(255,255,255,0.3);
          font-size: 0.85rem;
        }

        /* ============================================
           RESPONSIVE
           ============================================ */
        @media (max-width: 768px) {
          .dark-header .container {
            padding: 0 20px;
          }

          .dark-nav {
            gap: 16px;
          }

          .dark-nav-link:not(.hero-cta) {
            display: none;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 30px;
          }

          .stat-value {
            font-size: 2.5rem;
          }

          .process-step:not(:last-child)::after {
            display: none;
          }

          .process-steps {
            gap: 40px;
          }

          .dark-footer .container {
            flex-direction: column;
            gap: 20px;
            text-align: center;
          }

          .hero-cta {
            padding: 16px 32px;
            font-size: 1rem;
          }
        }
      `}</style>

      {/* Header */}
      <header className="dark-header">
        <div className="container">
          <Link to="/" className="dark-logo">
            <div className="dark-logo-icon">
              <Zap size={22} />
            </div>
            Power to the People
          </Link>
          <nav className="dark-nav">
            <Link to="/qualify" className="dark-nav-link">
              Get Started
            </Link>
            <Link to="/portal" className="dark-nav-link">
              Portal
            </Link>
            <Link
              to="/qualify"
              className="hero-cta"
              style={{
                padding: "12px 24px",
                fontSize: "0.95rem",
                opacity: 1,
                transform: "none",
                animation: "none",
              }}
            >
              Check Eligibility
            </Link>
          </nav>
        </div>
      </header>

      {/* Video Hero */}
      <section className="video-hero">
        <div className="hero-video-container">
          <video
            ref={videoRef}
            className="hero-video"
            autoPlay
            loop
            muted
            playsInline
            poster="/hero-poster.jpg"
          >
            <source src="/hero-bg.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="hero-overlay"></div>
        <div className="hero-vignette"></div>

        <div className="hero-content">
          <h1 className={`hero-tagline ${showContent ? "visible" : ""}`}>
            When the Grid Goes Dark,
            <br />
            <span className="highlight">Your Lights Stay On</span>
          </h1>
          <p className={`hero-subtitle ${showContent ? "visible" : ""}`}>
            Free battery backup for homeowners in qualifying Energy Communities.
            Never lose power during blackouts again.
          </p>
          <Link to="/qualify" className="hero-cta">
            Protect Your Home
            <ArrowRight size={20} />
          </Link>
        </div>

        <div className="scroll-indicator">
          <span></span>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-value">$0</div>
            <div className="stat-label">Cost to You</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">48+</div>
            <div className="stat-label">Hours Backup</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">10yr</div>
            <div className="stat-label">Warranty</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">1 Day</div>
            <div className="stat-label">Installation</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="dark-features">
        <div className="section-header">
          <h2 className="section-title">Never Be Left in the Dark</h2>
          <p className="section-subtitle">
            Premium battery backup, completely free
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <Battery size={32} />
            </div>
            <h3 className="feature-title">Duracell Home Batteries</h3>
            <p className="feature-desc">
              Premium Duracell battery system that powers your entire home
              during outages - AC, fridge, lights, everything.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Shield size={32} />
            </div>
            <h3 className="feature-title">Storm Protection</h3>
            <p className="feature-desc">
              Weather is unpredictable. Hurricanes, ice storms, grid failures -
              your family stays safe and comfortable.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Plug size={32} />
            </div>
            <h3 className="feature-title">Instant Switchover</h3>
            <p className="feature-desc">
              When the grid fails, your battery kicks in automatically - you
              won't even notice the lights flicker.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Sun size={32} />
            </div>
            <h3 className="feature-title">Solar Ready</h3>
            <p className="feature-desc">
              Already have solar or planning to get it? Your battery integrates
              seamlessly to maximize your savings.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-section">
        <div className="section-header">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">
            From signup to protection in 4 easy steps
          </p>
        </div>

        <div className="process-steps">
          <div className="process-step">
            <div className="process-number">1</div>
            <h3 className="process-title">Check Eligibility</h3>
            <p className="process-desc">
              Enter your address to see if you qualify for the Energy Community
              program
            </p>
          </div>

          <div className="process-step">
            <div className="process-number">2</div>
            <h3 className="process-title">Quick Signup</h3>
            <p className="process-desc">
              5-minute enrollment - we handle all the paperwork and permits
            </p>
          </div>

          <div className="process-step">
            <div className="process-number">3</div>
            <h3 className="process-title">Site Survey</h3>
            <p className="process-desc">
              A certified technician visits to plan your installation
            </p>
          </div>

          <div className="process-step">
            <div className="process-number">4</div>
            <h3 className="process-title">Installation</h3>
            <p className="process-desc">
              Professional installation completed in a single day
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <h2 className="cta-title">Ready to Take Control?</h2>
        <p className="cta-subtitle">
          Join thousands of homeowners who never worry about blackouts
        </p>
        <Link
          to="/qualify"
          className="hero-cta"
          style={{ opacity: 1, transform: "none", animation: "none" }}
        >
          Get Started Free
          <ArrowRight size={20} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="dark-footer">
        <div className="container">
          <div className="footer-links">
            <Link to="/" className="footer-link">
              Home
            </Link>
            <Link to="/qualify" className="footer-link">
              Get Started
            </Link>
            <Link to="/portal" className="footer-link">
              Customer Portal
            </Link>
          </div>
          <p className="footer-copy">
            &copy; 2026 Power to the People. Energy Community Solar Program.
          </p>
        </div>
      </footer>
    </div>
  );
}
