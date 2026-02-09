import { Link } from "react-router-dom";
import {
  Sun,
  ArrowRight,
  Zap,
  Users,
  Globe,
  Target,
  ChevronRight,
  Building2,
  TrendingUp,
  Shield,
  Award,
  Lightbulb,
  Heart,
  Code,
} from "lucide-react";

export default function About() {
  return (
    <div className="about-page">
      <style>{`
        .about-page {
          background: #0a0a0f;
          min-height: 100vh;
          color: #ffffff;
          overflow-x: hidden;
          font-family: 'Inter', -apple-system, sans-serif;
        }

        /* HEADER */
        .about-header {
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

        .about-header .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .about-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 800;
          font-size: 1.25rem;
          color: #fff;
          text-decoration: none;
          letter-spacing: -0.02em;
        }

        .about-logo-icon {
          width: 38px;
          height: 38px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 24px rgba(16, 185, 129, 0.4);
        }

        .about-nav {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .about-nav-link {
          color: rgba(255,255,255,0.6);
          text-decoration: none;
          font-weight: 500;
          font-size: 0.9rem;
          transition: all 0.3s;
          padding: 8px 16px;
          border-radius: 8px;
        }

        .about-nav-link:hover {
          color: #fff;
          background: rgba(255,255,255,0.05);
        }

        .about-nav-cta {
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

        .about-nav-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.5);
        }

        /* HERO */
        .about-hero {
          padding: 160px 40px 100px;
          text-align: center;
          position: relative;
        }

        .about-hero::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(ellipse 70% 50% at 50% 0%, rgba(16, 185, 129, 0.08) 0%, transparent 60%);
        }

        .about-hero-content {
          max-width: 800px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .about-hero-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 100px;
          font-size: 0.85rem;
          color: #34d399;
          font-weight: 500;
          margin-bottom: 32px;
        }

        .about-hero-title {
          font-size: clamp(2.5rem, 5vw, 4rem);
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 24px;
          letter-spacing: -0.03em;
        }

        .about-hero-title .highlight {
          background: linear-gradient(135deg, #10b981, #34d399, #6ee7b7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .about-hero-desc {
          font-size: 1.2rem;
          color: rgba(255,255,255,0.55);
          line-height: 1.8;
          max-width: 640px;
          margin: 0 auto;
        }

        /* COMMON */
        .about-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 40px;
        }

        .about-section-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #10b981;
          margin-bottom: 16px;
        }

        .about-section-title {
          font-size: clamp(1.8rem, 3.5vw, 2.5rem);
          font-weight: 800;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .about-section-desc {
          font-size: 1.1rem;
          color: rgba(255,255,255,0.5);
          line-height: 1.7;
          max-width: 600px;
        }

        /* ORIGIN */
        .origin-section {
          padding: 100px 0;
          background: #0f1419;
        }

        .origin-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
        }

        .origin-text p {
          color: rgba(255,255,255,0.55);
          font-size: 1.05rem;
          line-height: 1.8;
          margin-bottom: 20px;
        }

        .origin-stat-row {
          display: flex;
          gap: 32px;
          margin-top: 32px;
        }

        .origin-stat {
          text-align: center;
        }

        .origin-stat-value {
          font-size: 2.2rem;
          font-weight: 800;
          background: linear-gradient(135deg, #10b981, #34d399);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .origin-stat-label {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.4);
          font-weight: 500;
          margin-top: 4px;
        }

        .origin-visual {
          background: linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 24px;
          padding: 48px;
          position: relative;
          overflow: hidden;
        }

        .origin-visual::before {
          content: '';
          position: absolute;
          top: -30%;
          right: -30%;
          width: 60%;
          height: 60%;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 60%);
        }

        .origin-timeline {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .origin-timeline-item {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .origin-timeline-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #10b981;
          margin-top: 6px;
          flex-shrink: 0;
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
        }

        .origin-timeline-content h4 {
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .origin-timeline-content p {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.4);
          line-height: 1.5;
          margin: 0;
        }

        /* VALUES */
        .values-section {
          padding: 100px 0;
          background: #0a0a0f;
        }

        .values-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-top: 48px;
        }

        .value-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 36px 28px;
          transition: all 0.3s ease;
        }

        .value-card:hover {
          border-color: rgba(16, 185, 129, 0.2);
          transform: translateY(-4px);
        }

        .value-icon {
          width: 52px;
          height: 52px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05));
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          color: #10b981;
        }

        .value-title {
          font-size: 1.15rem;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .value-desc {
          color: rgba(255,255,255,0.45);
          font-size: 0.9rem;
          line-height: 1.6;
        }

        /* MODEL */
        .model-section {
          padding: 100px 0;
          background: #0f1419;
        }

        .model-content {
          max-width: 800px;
          margin: 0 auto;
          text-align: center;
        }

        .model-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-top: 48px;
        }

        .model-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 32px 24px;
          text-align: center;
          transition: all 0.3s;
        }

        .model-card:hover {
          border-color: rgba(16, 185, 129, 0.15);
        }

        .model-card-icon {
          color: #10b981;
          margin-bottom: 16px;
        }

        .model-card-title {
          font-size: 1.05rem;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .model-card-desc {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.4);
          line-height: 1.6;
        }

        /* TEAM */
        .team-section {
          padding: 100px 0;
          background: #0a0a0f;
        }

        .team-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-top: 48px;
        }

        .team-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 36px;
          text-align: center;
          transition: all 0.3s;
        }

        .team-card:hover {
          border-color: rgba(16, 185, 129, 0.15);
        }

        .team-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05));
          border: 2px solid rgba(16, 185, 129, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          color: #10b981;
          font-size: 1.5rem;
          font-weight: 800;
        }

        .team-name {
          font-size: 1.1rem;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .team-role {
          font-size: 0.85rem;
          color: #10b981;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .team-bio {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.4);
          line-height: 1.6;
        }

        /* CTA */
        .about-cta {
          padding: 120px 0;
          text-align: center;
          position: relative;
          background: #0f1419;
        }

        .about-cta::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(ellipse 60% 50% at 50% 50%, rgba(16, 185, 129, 0.08) 0%, transparent 60%);
        }

        .about-cta-content {
          position: relative;
          z-index: 1;
        }

        .about-cta-title {
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 800;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .about-cta-desc {
          font-size: 1.1rem;
          color: rgba(255,255,255,0.5);
          margin-bottom: 40px;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }

        .about-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 16px 32px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          font-weight: 700;
          font-size: 1rem;
          border-radius: 12px;
          text-decoration: none;
          transition: all 0.3s;
          box-shadow: 0 0 40px rgba(16, 185, 129, 0.3);
        }

        .about-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 60px rgba(16, 185, 129, 0.5);
        }

        /* FOOTER */
        .about-footer {
          padding: 40px 0;
          background: #050508;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .about-footer .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .about-footer-links {
          display: flex;
          gap: 32px;
        }

        .about-footer-links a {
          color: rgba(255,255,255,0.4);
          text-decoration: none;
          font-size: 0.85rem;
          transition: color 0.2s;
        }

        .about-footer-links a:hover {
          color: #10b981;
        }

        .about-footer-copy {
          color: rgba(255,255,255,0.25);
          font-size: 0.8rem;
        }

        /* CONTACT */
        .contact-section {
          padding: 80px 0;
          background: #0a0a0f;
        }

        .contact-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-top: 48px;
        }

        .contact-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 32px;
          text-align: center;
        }

        .contact-card-icon {
          color: #10b981;
          margin-bottom: 16px;
        }

        .contact-card-title {
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .contact-card-value {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.5);
        }

        .contact-card-value a {
          color: #10b981;
          text-decoration: none;
        }

        .contact-card-value a:hover {
          text-decoration: underline;
        }

        /* RESPONSIVE */
        @media (max-width: 1024px) {
          .origin-grid {
            grid-template-columns: 1fr;
            gap: 48px;
          }

          .values-grid,
          .model-cards,
          .team-grid,
          .contact-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 768px) {
          .about-nav-link:not(.about-nav-cta) {
            display: none;
          }

          .about-hero {
            padding: 120px 20px 60px;
          }

          .about-container {
            padding: 0 20px;
          }

          .values-grid,
          .model-cards,
          .team-grid,
          .contact-grid {
            grid-template-columns: 1fr;
          }

          .origin-stat-row {
            flex-wrap: wrap;
            gap: 24px;
          }

          .about-footer .container {
            flex-direction: column;
            gap: 16px;
            text-align: center;
          }
        }
      `}</style>

      {/* HEADER */}
      <header className="about-header">
        <div className="container">
          <Link to="/" className="about-logo">
            <div className="about-logo-icon">
              <Sun size={20} />
            </div>
            SolarOS
          </Link>
          <nav className="about-nav">
            <Link to="/features" className="about-nav-link">
              Features
            </Link>
            <Link to="/pricing" className="about-nav-link">
              Pricing
            </Link>
            <Link to="/about" className="about-nav-link">
              About
            </Link>
            <Link to="/login" className="about-nav-link">
              Sign In
            </Link>
            <Link to="/get-started" className="about-nav-cta">
              Get Started
              <ArrowRight size={16} />
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="about-hero">
        <div className="about-hero-content">
          <div className="about-hero-label">
            <Building2 size={14} />
            About SolarOS
          </div>
          <h1 className="about-hero-title">
            Democratizing solar
            <br />
            <span className="highlight">through technology</span>
          </h1>
          <p className="about-hero-desc">
            We believe every homeowner deserves access to clean energy, and
            every installer deserves a fair, open marketplace. SolarOS is the
            platform making that possible.
          </p>
        </div>
      </section>

      {/* ORIGIN STORY */}
      <section className="origin-section">
        <div className="about-container">
          <div className="origin-grid">
            <div className="origin-text">
              <div className="about-section-label">
                <Lightbulb size={14} />
                Our Story
              </div>
              <h2 className="about-section-title">
                Built by operators, not outsiders
              </h2>
              <p>
                SolarOS was founded by the former CEO of Pure Energy, one of the
                fastest-growing residential solar companies in the United
                States, reaching $100M in peak annual revenue.
              </p>
              <p>
                After years of watching the industry struggle with fragmented
                tools, manual processes, and inefficient supply chains, we set
                out to build what the industry actually needs: a single platform
                that automates the entire solar installation lifecycle.
              </p>
              <p>
                We call it the "platform-as-the-installer" model. Instead of a
                traditional solar company with employees and overhead, SolarOS
                is an open marketplace where qualified workers bid on tasks, AI
                matches the best fit, and every stage from lead to PTO is
                automated with built-in quality controls.
              </p>

              <div className="origin-stat-row">
                <div className="origin-stat">
                  <div className="origin-stat-value">$100M</div>
                  <div className="origin-stat-label">Peak Revenue</div>
                </div>
                <div className="origin-stat">
                  <div className="origin-stat-value">15yr</div>
                  <div className="origin-stat-label">Industry Experience</div>
                </div>
                <div className="origin-stat">
                  <div className="origin-stat-value">50K+</div>
                  <div className="origin-stat-label">Installations</div>
                </div>
              </div>
            </div>

            <div className="origin-visual">
              <div className="origin-timeline">
                <div className="origin-timeline-item">
                  <div className="origin-timeline-dot" />
                  <div className="origin-timeline-content">
                    <h4>The Problem</h4>
                    <p>
                      Solar companies use 10+ disconnected tools for leads,
                      permits, scheduling, and compliance. Every handoff is
                      manual.
                    </p>
                  </div>
                </div>
                <div className="origin-timeline-item">
                  <div className="origin-timeline-dot" />
                  <div className="origin-timeline-content">
                    <h4>The Insight</h4>
                    <p>
                      What if the platform itself was the installer? One system
                      that orchestrates every stage with AI and automation.
                    </p>
                  </div>
                </div>
                <div className="origin-timeline-item">
                  <div className="origin-timeline-dot" />
                  <div className="origin-timeline-content">
                    <h4>The Platform</h4>
                    <p>
                      SolarOS: an open marketplace with a 10-stage automated
                      pipeline, smart bidding, compliance engine, and nationwide
                      data.
                    </p>
                  </div>
                </div>
                <div className="origin-timeline-item">
                  <div className="origin-timeline-dot" />
                  <div className="origin-timeline-content">
                    <h4>The Mission</h4>
                    <p>
                      Make solar accessible to every homeowner and profitable
                      for every qualified worker in every state.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="values-section">
        <div className="about-container">
          <div style={{ textAlign: "center" }}>
            <div
              className="about-section-label"
              style={{ justifyContent: "center" }}
            >
              <Heart size={14} />
              Our Values
            </div>
            <h2 className="about-section-title">What drives us</h2>
          </div>

          <div className="values-grid">
            <div className="value-card">
              <div className="value-icon">
                <Globe size={24} />
              </div>
              <h3 className="value-title">Open Marketplace</h3>
              <p className="value-desc">
                Any qualified worker can bid on any task. No gatekeepers, no
                exclusive territories. Merit and performance win.
              </p>
            </div>

            <div className="value-card">
              <div className="value-icon">
                <Zap size={24} />
              </div>
              <h3 className="value-title">Automation First</h3>
              <p className="value-desc">
                If a human does not need to touch it, automate it. Every manual
                process is a failure waiting to happen.
              </p>
            </div>

            <div className="value-card">
              <div className="value-icon">
                <Shield size={24} />
              </div>
              <h3 className="value-title">Compliance by Default</h3>
              <p className="value-desc">
                FEOC, ITC, domestic content, tariffs -- compliance is built into
                every equipment selection and project flow.
              </p>
            </div>

            <div className="value-card">
              <div className="value-icon">
                <Users size={24} />
              </div>
              <h3 className="value-title">Homeowner-Centric</h3>
              <p className="value-desc">
                The customer sees every stage of their project in real time.
                Full transparency from contract to interconnection.
              </p>
            </div>

            <div className="value-card">
              <div className="value-icon">
                <Target size={24} />
              </div>
              <h3 className="value-title">Data-Driven Decisions</h3>
              <p className="value-desc">
                Utility rates, incentives, irradiance, permitting -- every
                recommendation is backed by real data for all 50 states.
              </p>
            </div>

            <div className="value-card">
              <div className="value-icon">
                <Code size={24} />
              </div>
              <h3 className="value-title">API-First Platform</h3>
              <p className="value-desc">
                Full REST APIs, webhooks, and developer tools. SolarOS
                integrates with your existing systems, not the other way around.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PLATFORM MODEL */}
      <section className="model-section">
        <div className="about-container">
          <div className="model-content">
            <div
              className="about-section-label"
              style={{ justifyContent: "center" }}
            >
              <Building2 size={14} />
              Our Model
            </div>
            <h2 className="about-section-title">Platform-as-the-Installer</h2>
            <p className="about-section-desc" style={{ margin: "0 auto" }}>
              Instead of a traditional solar company, SolarOS operates as a
              technology platform. The platform orchestrates every stage while
              independent contractors do the hands-on work.
            </p>

            <div className="model-cards">
              <div className="model-card">
                <div className="model-card-icon">
                  <TrendingUp size={28} />
                </div>
                <h3 className="model-card-title">Lower Costs</h3>
                <p className="model-card-desc">
                  No fleet, no warehouse, no W-2 install crews. Marketplace
                  dynamics keep pricing competitive for homeowners.
                </p>
              </div>
              <div className="model-card">
                <div className="model-card-icon">
                  <Globe size={28} />
                </div>
                <h3 className="model-card-title">Instant Scale</h3>
                <p className="model-card-desc">
                  Launch in any market without hiring. Workers are already
                  there, ready to bid on work in their area.
                </p>
              </div>
              <div className="model-card">
                <div className="model-card-icon">
                  <Award size={28} />
                </div>
                <h3 className="model-card-title">Quality Control</h3>
                <p className="model-card-desc">
                  SLA enforcement, photo QC, reliability scoring, and automated
                  re-queuing ensure consistent quality.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section className="team-section">
        <div className="about-container">
          <div style={{ textAlign: "center" }}>
            <div
              className="about-section-label"
              style={{ justifyContent: "center" }}
            >
              <Users size={14} />
              Leadership
            </div>
            <h2 className="about-section-title">The team behind SolarOS</h2>
          </div>

          <div className="team-grid">
            <div className="team-card">
              <div className="team-avatar">JG</div>
              <h3 className="team-name">Justin Griffith</h3>
              <p className="team-role">Founder & CEO</p>
              <p className="team-bio">
                Former CEO of Pure Energy. 15+ years in residential solar. Built
                and scaled a company to $100M in annual revenue.
              </p>
            </div>
            <div className="team-card">
              <div className="team-avatar">
                <Zap size={28} />
              </div>
              <h3 className="team-name">Ava</h3>
              <p className="team-role">AI Agent</p>
              <p className="team-bio">
                Our autonomous AI agent handles research, data collection,
                system monitoring, and task coordination 24/7.
              </p>
            </div>
            <div className="team-card">
              <div className="team-avatar">
                <Users size={28} />
              </div>
              <h3 className="team-name">Growing Team</h3>
              <p className="team-role">Join Us</p>
              <p className="team-bio">
                We are building the future of solar. If you are passionate about
                clean energy and technology, reach out.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="contact-section">
        <div className="about-container">
          <div style={{ textAlign: "center" }}>
            <div
              className="about-section-label"
              style={{ justifyContent: "center" }}
            >
              <Globe size={14} />
              Get in Touch
            </div>
            <h2 className="about-section-title">Contact us</h2>
          </div>

          <div className="contact-grid">
            <div className="contact-card">
              <div className="contact-card-icon">
                <Zap size={28} />
              </div>
              <h3 className="contact-card-title">General Inquiries</h3>
              <p className="contact-card-value">
                <a href="mailto:info@solarios.io">info@solarios.io</a>
              </p>
            </div>
            <div className="contact-card">
              <div className="contact-card-icon">
                <Users size={28} />
              </div>
              <h3 className="contact-card-title">Installer Partnerships</h3>
              <p className="contact-card-value">
                <a href="mailto:partners@solarios.io">partners@solarios.io</a>
              </p>
            </div>
            <div className="contact-card">
              <div className="contact-card-icon">
                <Code size={28} />
              </div>
              <h3 className="contact-card-title">API & Developer Support</h3>
              <p className="contact-card-value">
                <a href="mailto:support@solarios.io">support@solarios.io</a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="about-cta">
        <div className="about-cta-content">
          <h2 className="about-cta-title">Ready to join the mission?</h2>
          <p className="about-cta-desc">
            Whether you are a homeowner, installer, or sales professional,
            SolarOS has a place for you.
          </p>
          <Link to="/get-started" className="about-btn-primary">
            Get Started
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="about-footer">
        <div className="container">
          <div className="about-footer-links">
            <Link to="/">Home</Link>
            <Link to="/features">Features</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/about">About</Link>
          </div>
          <p className="about-footer-copy">
            &copy; 2026 SolarOS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
