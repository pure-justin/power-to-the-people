import { useState, useEffect, useRef } from "react";
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
  CheckCircle2,
  Code,
  Package,
  FileCheck,
  Calendar,
  DollarSign,
  ClipboardCheck,
  Layers,
  Timer,
  MapPin,
  Star,
  Truck,
  Lock,
  BarChart3,
  Webhook,
  Database,
  Wrench,
  Activity,
  Search,
  Hammer,
  Eye,
} from "lucide-react";

export default function Features() {
  const [visibleSections, setVisibleSections] = useState(new Set());
  const sectionRefs = useRef({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.1 },
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const setSectionRef = (id) => (el) => {
    sectionRefs.current[id] = el;
  };

  const isVisible = (id) => visibleSections.has(id);

  return (
    <div className="features-page">
      <style>{`
        .features-page {
          background: #0a0a0f;
          min-height: 100vh;
          color: #ffffff;
          overflow-x: hidden;
          font-family: 'Inter', -apple-system, sans-serif;
        }

        /* HEADER */
        .fp-header {
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

        .fp-header .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .fp-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 800;
          font-size: 1.25rem;
          color: #fff;
          text-decoration: none;
          letter-spacing: -0.02em;
        }

        .fp-logo-icon {
          width: 38px;
          height: 38px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 24px rgba(16, 185, 129, 0.4);
        }

        .fp-nav {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .fp-nav-link {
          color: rgba(255,255,255,0.6);
          text-decoration: none;
          font-weight: 500;
          font-size: 0.9rem;
          transition: all 0.3s;
          padding: 8px 16px;
          border-radius: 8px;
        }

        .fp-nav-link:hover {
          color: #fff;
          background: rgba(255,255,255,0.05);
        }

        .fp-nav-cta {
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

        .fp-nav-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.5);
        }

        /* HERO */
        .fp-hero {
          padding: 160px 40px 80px;
          text-align: center;
          position: relative;
        }

        .fp-hero::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(ellipse 70% 50% at 50% 0%, rgba(16, 185, 129, 0.08) 0%, transparent 60%);
        }

        .fp-hero-content {
          max-width: 800px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .fp-hero-label {
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

        .fp-hero-title {
          font-size: clamp(2.5rem, 5vw, 4rem);
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 24px;
          letter-spacing: -0.03em;
        }

        .fp-hero-title .highlight {
          background: linear-gradient(135deg, #10b981, #34d399, #6ee7b7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .fp-hero-desc {
          font-size: 1.2rem;
          color: rgba(255,255,255,0.55);
          line-height: 1.8;
          max-width: 640px;
          margin: 0 auto;
        }

        /* COMMON */
        .fp-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 40px;
        }

        .fp-section-animate {
          opacity: 0;
          transform: translateY(40px);
          transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .fp-section-animate.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .fp-section-label {
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

        .fp-section-title {
          font-size: clamp(1.8rem, 3.5vw, 2.5rem);
          font-weight: 800;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .fp-section-desc {
          font-size: 1.1rem;
          color: rgba(255,255,255,0.5);
          line-height: 1.7;
          max-width: 600px;
        }

        .fp-section-header {
          text-align: center;
          margin-bottom: 64px;
        }

        .fp-section-header .fp-section-desc {
          margin: 0 auto;
        }

        /* FEATURE SECTION */
        .fp-section {
          padding: 100px 0;
        }

        .fp-section.alt-bg {
          background: #0f1419;
        }

        /* FEATURE DETAIL GRID */
        .fp-detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
        }

        .fp-detail-grid.reverse {
          direction: rtl;
        }

        .fp-detail-grid.reverse > * {
          direction: ltr;
        }

        .fp-detail-text {
          max-width: 520px;
        }

        .fp-detail-visual {
          background: linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 24px;
          padding: 40px;
          position: relative;
          overflow: hidden;
        }

        .fp-detail-visual::before {
          content: '';
          position: absolute;
          top: -30%;
          right: -30%;
          width: 60%;
          height: 60%;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, transparent 60%);
        }

        .fp-feature-list {
          list-style: none;
          padding: 0;
          margin: 24px 0 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .fp-feature-list li {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          color: rgba(255,255,255,0.65);
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .fp-feature-list li svg {
          color: #10b981;
          flex-shrink: 0;
          margin-top: 2px;
        }

        /* TASK TYPES */
        .fp-task-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
          position: relative;
          z-index: 1;
        }

        .fp-task-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 24px 16px;
          text-align: center;
          transition: all 0.3s;
        }

        .fp-task-card:hover {
          border-color: rgba(16, 185, 129, 0.2);
          transform: translateY(-2px);
        }

        .fp-task-icon {
          color: #10b981;
          margin-bottom: 10px;
        }

        .fp-task-name {
          font-size: 0.8rem;
          font-weight: 600;
          color: rgba(255,255,255,0.7);
        }

        /* PIPELINE */
        .fp-pipeline {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: center;
          position: relative;
          z-index: 1;
        }

        .fp-stage {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          transition: all 0.3s;
        }

        .fp-stage:hover {
          border-color: rgba(16, 185, 129, 0.3);
          background: rgba(16, 185, 129, 0.05);
        }

        .fp-stage-num {
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          color: #10b981;
        }

        .fp-stage-name {
          font-size: 0.85rem;
          font-weight: 600;
        }

        /* COMPLIANCE CARDS */
        .fp-compliance-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          position: relative;
          z-index: 1;
        }

        .fp-compliance-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 32px;
          transition: all 0.3s;
        }

        .fp-compliance-card:hover {
          border-color: rgba(16, 185, 129, 0.2);
          transform: translateY(-4px);
        }

        .fp-compliance-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05));
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          color: #10b981;
        }

        .fp-compliance-title {
          font-size: 1.05rem;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .fp-compliance-desc {
          font-size: 0.88rem;
          color: rgba(255,255,255,0.45);
          line-height: 1.6;
        }

        /* API SECTION */
        .fp-api-block {
          background: linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 24px;
          overflow: hidden;
        }

        .fp-api-header {
          padding: 20px 28px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .fp-api-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .fp-api-code {
          padding: 28px;
          font-family: 'SF Mono', 'Fira Code', monospace;
          font-size: 0.85rem;
          line-height: 1.8;
          color: rgba(255,255,255,0.6);
          overflow-x: auto;
        }

        .fp-api-code .method {
          color: #10b981;
          font-weight: 700;
        }

        .fp-api-code .url {
          color: #60a5fa;
        }

        .fp-api-code .comment {
          color: rgba(255,255,255,0.25);
        }

        .fp-api-features {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-top: 32px;
        }

        .fp-api-feature {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .fp-api-feature-icon {
          width: 40px;
          height: 40px;
          background: rgba(16, 185, 129, 0.1);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #10b981;
        }

        .fp-api-feature-title {
          font-size: 0.95rem;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .fp-api-feature-desc {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.4);
          line-height: 1.5;
        }

        /* DATA SECTION */
        .fp-data-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          position: relative;
          z-index: 1;
        }

        .fp-data-stat {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 28px;
          text-align: center;
          transition: all 0.3s;
        }

        .fp-data-stat:hover {
          border-color: rgba(16, 185, 129, 0.15);
        }

        .fp-data-stat-icon {
          color: #10b981;
          margin-bottom: 12px;
        }

        .fp-data-stat-value {
          font-size: 2rem;
          font-weight: 800;
          background: linear-gradient(135deg, #10b981, #34d399);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 4px;
        }

        .fp-data-stat-label {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.4);
          font-weight: 500;
        }

        /* CTA */
        .fp-cta {
          padding: 120px 0;
          text-align: center;
          position: relative;
          background: #0f1419;
        }

        .fp-cta::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(ellipse 60% 50% at 50% 50%, rgba(16, 185, 129, 0.08) 0%, transparent 60%);
        }

        .fp-cta-content {
          position: relative;
          z-index: 1;
        }

        .fp-cta-title {
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 800;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .fp-cta-desc {
          font-size: 1.1rem;
          color: rgba(255,255,255,0.5);
          margin-bottom: 40px;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }

        .fp-btn-primary {
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

        .fp-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 60px rgba(16, 185, 129, 0.5);
        }

        .fp-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 16px 32px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          font-weight: 600;
          font-size: 1rem;
          border-radius: 12px;
          text-decoration: none;
          transition: all 0.3s;
          margin-left: 16px;
        }

        .fp-btn-secondary:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.2);
        }

        /* FOOTER */
        .fp-footer {
          padding: 40px 0;
          background: #050508;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .fp-footer .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .fp-footer-links {
          display: flex;
          gap: 32px;
        }

        .fp-footer-links a {
          color: rgba(255,255,255,0.4);
          text-decoration: none;
          font-size: 0.85rem;
          transition: color 0.2s;
        }

        .fp-footer-links a:hover {
          color: #10b981;
        }

        .fp-footer-copy {
          color: rgba(255,255,255,0.25);
          font-size: 0.8rem;
        }

        /* RESPONSIVE */
        @media (max-width: 1024px) {
          .fp-detail-grid {
            grid-template-columns: 1fr;
            gap: 48px;
          }

          .fp-detail-grid.reverse {
            direction: ltr;
          }

          .fp-task-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .fp-compliance-grid {
            grid-template-columns: 1fr 1fr;
          }

          .fp-data-stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .fp-api-features {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .fp-nav-link:not(.fp-nav-cta) {
            display: none;
          }

          .fp-hero {
            padding: 120px 20px 60px;
          }

          .fp-container {
            padding: 0 20px;
          }

          .fp-task-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .fp-compliance-grid {
            grid-template-columns: 1fr;
          }

          .fp-data-stats {
            grid-template-columns: 1fr;
          }

          .fp-footer .container {
            flex-direction: column;
            gap: 16px;
            text-align: center;
          }
        }
      `}</style>

      {/* HEADER */}
      <header className="fp-header">
        <div className="container">
          <Link to="/" className="fp-logo">
            <div className="fp-logo-icon">
              <Sun size={20} />
            </div>
            SolarOS
          </Link>
          <nav className="fp-nav">
            <Link to="/features" className="fp-nav-link">
              Features
            </Link>
            <Link to="/pricing" className="fp-nav-link">
              Pricing
            </Link>
            <Link to="/about" className="fp-nav-link">
              About
            </Link>
            <Link to="/login" className="fp-nav-link">
              Sign In
            </Link>
            <Link to="/get-started" className="fp-nav-cta">
              Get Started
              <ArrowRight size={16} />
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="fp-hero">
        <div className="fp-hero-content">
          <div className="fp-hero-label">
            <Layers size={14} />
            Platform Features
          </div>
          <h1 className="fp-hero-title">
            Every tool you need,
            <br />
            <span className="highlight">one platform</span>
          </h1>
          <p className="fp-hero-desc">
            From lead intake to grid interconnection, SolarOS replaces your
            spreadsheets, phone chains, and disconnected tools with a single
            automated system.
          </p>
        </div>
      </section>

      {/* MARKETPLACE */}
      <section
        id="marketplace"
        ref={setSectionRef("marketplace")}
        className="fp-section alt-bg"
      >
        <div className="fp-container">
          <div
            className={`fp-detail-grid fp-section-animate ${isVisible("marketplace") ? "visible" : ""}`}
          >
            <div className="fp-detail-text">
              <div className="fp-section-label">
                <Building2 size={14} />
                Open Marketplace
              </div>
              <h2 className="fp-section-title">
                10 task types, one marketplace
              </h2>
              <p className="fp-section-desc">
                Every stage of a solar installation can be posted as a task.
                Qualified workers bid, AI scores each bid, and the best match
                wins.
              </p>
              <ul className="fp-feature-list">
                <li>
                  <CheckCircle2 size={16} />
                  <span>
                    Smart bidding with 7-factor scoring (price, rating,
                    proximity, speed, availability, experience, reliability)
                  </span>
                </li>
                <li>
                  <CheckCircle2 size={16} />
                  <span>
                    SLA enforcement with automated strike system and reliability
                    scores
                  </span>
                </li>
                <li>
                  <CheckCircle2 size={16} />
                  <span>
                    Worker profiles with ratings, certifications, and service
                    history
                  </span>
                </li>
                <li>
                  <CheckCircle2 size={16} />
                  <span>
                    Radius-based matching using 356+ zip code coordinates
                  </span>
                </li>
                <li>
                  <CheckCircle2 size={16} />
                  <span>Automatic re-queuing when SLAs are missed</span>
                </li>
              </ul>
            </div>

            <div className="fp-detail-visual">
              <div className="fp-task-grid">
                {[
                  { icon: Eye, name: "Survey" },
                  { icon: Wrench, name: "Design" },
                  { icon: FileCheck, name: "Permit" },
                  { icon: Hammer, name: "Install" },
                  { icon: Search, name: "Inspect" },
                  { icon: Zap, name: "Electric" },
                  { icon: Building2, name: "Roofing" },
                  { icon: Activity, name: "Monitor" },
                  { icon: Shield, name: "QC" },
                  { icon: Globe, name: "PTO" },
                ].map((task) => (
                  <div key={task.name} className="fp-task-card">
                    <div className="fp-task-icon">
                      <task.icon size={22} />
                    </div>
                    <div className="fp-task-name">{task.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PIPELINE */}
      <section
        id="pipeline"
        ref={setSectionRef("pipeline")}
        className="fp-section"
      >
        <div className="fp-container">
          <div
            className={`fp-section-header fp-section-animate ${isVisible("pipeline") ? "visible" : ""}`}
          >
            <div className="fp-section-label">
              <Layers size={14} />
              Automated Pipeline
            </div>
            <h2 className="fp-section-title">
              10 stages, zero manual handoffs
            </h2>
            <p className="fp-section-desc">
              Each stage auto-triggers the next. Tasks are created, workers are
              matched, quality is verified, and the project advances -- all
              without human intervention.
            </p>
          </div>

          <div
            className={`fp-pipeline fp-section-animate ${isVisible("pipeline") ? "visible" : ""}`}
          >
            {[
              "Sold",
              "Survey",
              "CAD Design",
              "Engineering",
              "Permit",
              "Install",
              "Inspection",
              "Meter Swap",
              "PTO",
              "Complete",
            ].map((stage, i) => (
              <div key={stage} className="fp-stage">
                <div className="fp-stage-num">{i + 1}</div>
                <span className="fp-stage-name">{stage}</span>
                {i < 9 && (
                  <ChevronRight
                    size={14}
                    style={{ color: "rgba(255,255,255,0.2)" }}
                  />
                )}
              </div>
            ))}
          </div>

          <div
            className={`fp-detail-grid fp-section-animate ${isVisible("pipeline") ? "visible" : ""}`}
            style={{ marginTop: 64 }}
          >
            <div className="fp-detail-text">
              <h3
                style={{
                  fontSize: "1.3rem",
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                Dependency-driven automation
              </h3>
              <p className="fp-section-desc">
                Tasks are chained with dependencies. Survey completion triggers
                CAD design. Permit approval triggers install scheduling. Every
                transition is automatic.
              </p>
              <ul className="fp-feature-list">
                <li>
                  <CheckCircle2 size={16} />
                  <span>Auto-task creation when stages advance</span>
                </li>
                <li>
                  <CheckCircle2 size={16} />
                  <span>
                    SLA timers on every stage with configurable deadlines
                  </span>
                </li>
                <li>
                  <CheckCircle2 size={16} />
                  <span>Automatic marketplace posting for unfilled tasks</span>
                </li>
                <li>
                  <CheckCircle2 size={16} />
                  <span>Real-time progress tracking for all stakeholders</span>
                </li>
              </ul>
            </div>

            <div className="fp-detail-visual">
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {[
                  {
                    stage: "Survey Complete",
                    action: "CAD Design task created",
                    time: "Instant",
                  },
                  {
                    stage: "Design Approved",
                    action: "Permit package generated",
                    time: "< 1min",
                  },
                  {
                    stage: "Permit Issued",
                    action: "Install crew matched",
                    time: "< 5min",
                  },
                  {
                    stage: "Install Done",
                    action: "Inspection scheduled",
                    time: "Instant",
                  },
                ].map((item) => (
                  <div
                    key={item.stage}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px 20px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                        {item.stage}
                      </div>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "rgba(255,255,255,0.4)",
                        }}
                      >
                        {item.action}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#10b981",
                        fontWeight: 600,
                      }}
                    >
                      {item.time}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMPLIANCE */}
      <section
        id="compliance"
        ref={setSectionRef("compliance")}
        className="fp-section alt-bg"
      >
        <div className="fp-container">
          <div
            className={`fp-section-header fp-section-animate ${isVisible("compliance") ? "visible" : ""}`}
          >
            <div className="fp-section-label">
              <Shield size={14} />
              Compliance Engine
            </div>
            <h2 className="fp-section-title">
              Compliance built into every decision
            </h2>
            <p className="fp-section-desc">
              Navigate the complex 2026 regulatory landscape with automated
              compliance checks on every equipment selection and project
              configuration.
            </p>
          </div>

          <div
            className={`fp-compliance-grid fp-section-animate ${isVisible("compliance") ? "visible" : ""}`}
          >
            <div className="fp-compliance-card">
              <div className="fp-compliance-icon">
                <Shield size={22} />
              </div>
              <h3 className="fp-compliance-title">FEOC Compliance</h3>
              <p className="fp-compliance-desc">
                Automatic screening against Foreign Entity of Concern
                restrictions. Ensures no components from China, Russia, North
                Korea, or Iran.
              </p>
            </div>
            <div className="fp-compliance-card">
              <div className="fp-compliance-icon">
                <DollarSign size={22} />
              </div>
              <h3 className="fp-compliance-title">ITC Eligibility</h3>
              <p className="fp-compliance-desc">
                Real-time Investment Tax Credit qualification analysis.
                Residential ITC ended Jan 2026 -- TPO/commercial pathways
                identified automatically.
              </p>
            </div>
            <div className="fp-compliance-card">
              <div className="fp-compliance-icon">
                <Award size={22} />
              </div>
              <h3 className="fp-compliance-title">Domestic Content</h3>
              <p className="fp-compliance-desc">
                Track the 50% domestic content threshold for ITC bonus.
                Equipment database flags US-manufactured components
                automatically.
              </p>
            </div>
            <div className="fp-compliance-card">
              <div className="fp-compliance-icon">
                <Lock size={22} />
              </div>
              <h3 className="fp-compliance-title">Tariff Analysis</h3>
              <p className="fp-compliance-desc">
                AD/CVD tariff tracking on SE Asian imports (up to 3,400%).
                Equipment marked as tariff-safe or subject to duties.
              </p>
            </div>
            <div className="fp-compliance-card">
              <div className="fp-compliance-icon">
                <Globe size={22} />
              </div>
              <h3 className="fp-compliance-title">Net Billing Transition</h3>
              <p className="fp-compliance-desc">
                State-by-state net metering vs. net billing policy tracking.
                Automated rate analysis for accurate savings projections.
              </p>
            </div>
            <div className="fp-compliance-card">
              <div className="fp-compliance-icon">
                <FileCheck size={22} />
              </div>
              <h3 className="fp-compliance-title">AHJ Requirements</h3>
              <p className="fp-compliance-desc">
                Authority Having Jurisdiction database with permit requirements,
                inspection standards, and documentation templates by county.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* API */}
      <section id="api" ref={setSectionRef("api")} className="fp-section">
        <div className="fp-container">
          <div
            className={`fp-detail-grid fp-section-animate ${isVisible("api") ? "visible" : ""}`}
          >
            <div className="fp-detail-text">
              <div className="fp-section-label">
                <Code size={14} />
                Developer API
              </div>
              <h2 className="fp-section-title">REST APIs for everything</h2>
              <p className="fp-section-desc">
                Full API access to marketplace listings, project pipelines,
                solar data, and webhooks. HMAC-signed security with scoped API
                keys.
              </p>

              <div className="fp-api-features" style={{ marginTop: 32 }}>
                <div className="fp-api-feature">
                  <div className="fp-api-feature-icon">
                    <Code size={18} />
                  </div>
                  <div>
                    <div className="fp-api-feature-title">30+ Endpoints</div>
                    <div className="fp-api-feature-desc">
                      Marketplace, projects, workers, solar data, webhooks
                    </div>
                  </div>
                </div>
                <div className="fp-api-feature">
                  <div className="fp-api-feature-icon">
                    <Lock size={18} />
                  </div>
                  <div>
                    <div className="fp-api-feature-title">Scoped API Keys</div>
                    <div className="fp-api-feature-desc">
                      20+ scopes for granular access control
                    </div>
                  </div>
                </div>
                <div className="fp-api-feature">
                  <div className="fp-api-feature-icon">
                    <Zap size={18} />
                  </div>
                  <div>
                    <div className="fp-api-feature-title">Webhooks</div>
                    <div className="fp-api-feature-desc">
                      HMAC-signed delivery with retry logic
                    </div>
                  </div>
                </div>
                <div className="fp-api-feature">
                  <div className="fp-api-feature-icon">
                    <BarChart3 size={18} />
                  </div>
                  <div>
                    <div className="fp-api-feature-title">Rate Limiting</div>
                    <div className="fp-api-feature-desc">
                      Per-minute, hourly, daily, and monthly tiers
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="fp-api-block">
                <div className="fp-api-header">
                  <div
                    className="fp-api-dot"
                    style={{ background: "#ef4444" }}
                  />
                  <div
                    className="fp-api-dot"
                    style={{ background: "#eab308" }}
                  />
                  <div
                    className="fp-api-dot"
                    style={{ background: "#22c55e" }}
                  />
                  <span
                    style={{
                      marginLeft: 12,
                      fontSize: "0.8rem",
                      color: "rgba(255,255,255,0.4)",
                    }}
                  >
                    API Examples
                  </span>
                </div>
                <div className="fp-api-code">
                  <div>
                    <span className="comment"># Browse marketplace</span>
                  </div>
                  <div>
                    <span className="method">GET</span>{" "}
                    <span className="url">/marketplace/listings?state=TX</span>
                  </div>
                  <br />
                  <div>
                    <span className="comment"># Submit a bid</span>
                  </div>
                  <div>
                    <span className="method">POST</span>{" "}
                    <span className="url">/marketplace/listings/:id/bid</span>
                  </div>
                  <br />
                  <div>
                    <span className="comment"># Advance project stage</span>
                  </div>
                  <div>
                    <span className="method">POST</span>{" "}
                    <span className="url">/projects/:id/advance</span>
                  </div>
                  <br />
                  <div>
                    <span className="comment"># Run compliance check</span>
                  </div>
                  <div>
                    <span className="method">POST</span>{" "}
                    <span className="url">/solar/compliance-check</span>
                  </div>
                  <br />
                  <div>
                    <span className="comment"># Register webhook</span>
                  </div>
                  <div>
                    <span className="method">POST</span>{" "}
                    <span className="url">/webhooks</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EQUIPMENT */}
      <section
        id="equipment"
        ref={setSectionRef("equipment")}
        className="fp-section alt-bg"
      >
        <div className="fp-container">
          <div
            className={`fp-detail-grid reverse fp-section-animate ${isVisible("equipment") ? "visible" : ""}`}
          >
            <div className="fp-detail-text">
              <div className="fp-section-label">
                <Package size={14} />
                Equipment Database
              </div>
              <h2 className="fp-section-title">
                9 categories, real specifications
              </h2>
              <p className="fp-section-desc">
                Every major solar equipment category with manufacturer specs,
                compliance flags, and availability tracking.
              </p>
              <ul className="fp-feature-list">
                <li>
                  <CheckCircle2 size={16} />
                  <span>
                    Panels, inverters, batteries, racking, optimizers, and more
                  </span>
                </li>
                <li>
                  <CheckCircle2 size={16} />
                  <span>
                    FEOC, domestic content, and tariff compliance flags on every
                    item
                  </span>
                </li>
                <li>
                  <CheckCircle2 size={16} />
                  <span>
                    Manufacturer specifications with wattage, efficiency, and
                    warranty data
                  </span>
                </li>
                <li>
                  <CheckCircle2 size={16} />
                  <span>
                    API-accessible for integration with design and estimation
                    tools
                  </span>
                </li>
              </ul>
            </div>

            <div className="fp-detail-visual">
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {[
                  { cat: "Solar Panels", count: "200+", flag: "FEOC Checked" },
                  { cat: "Inverters", count: "85+", flag: "UL Listed" },
                  { cat: "Batteries", count: "45+", flag: "Domestic Content" },
                  { cat: "Racking", count: "60+", flag: "Tariff Safe" },
                  { cat: "Optimizers", count: "30+", flag: "FEOC Checked" },
                ].map((item) => (
                  <div
                    key={item.cat}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 20px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 12,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <Package size={16} style={{ color: "#10b981" }} />
                      <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                        {item.cat}
                      </span>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 16 }}
                    >
                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "rgba(255,255,255,0.4)",
                        }}
                      >
                        {item.count} items
                      </span>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          padding: "3px 10px",
                          background: "rgba(16,185,129,0.1)",
                          color: "#10b981",
                          borderRadius: 100,
                          fontWeight: 600,
                        }}
                      >
                        {item.flag}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NATIONWIDE DATA */}
      <section id="data" ref={setSectionRef("data")} className="fp-section">
        <div className="fp-container">
          <div
            className={`fp-section-header fp-section-animate ${isVisible("data") ? "visible" : ""}`}
          >
            <div className="fp-section-label">
              <Database size={14} />
              Nationwide Data
            </div>
            <h2 className="fp-section-title">Real data for every market</h2>
            <p className="fp-section-desc">
              Utility rates, incentive programs, net metering policies, solar
              irradiance, and permitting requirements for all 50 states.
              Refreshed weekly from NREL and OpenEI.
            </p>
          </div>

          <div
            className={`fp-data-stats fp-section-animate ${isVisible("data") ? "visible" : ""}`}
          >
            <div className="fp-data-stat">
              <div className="fp-data-stat-icon">
                <Globe size={24} />
              </div>
              <div className="fp-data-stat-value">3,000+</div>
              <div className="fp-data-stat-label">Utility Providers</div>
            </div>
            <div className="fp-data-stat">
              <div className="fp-data-stat-icon">
                <DollarSign size={24} />
              </div>
              <div className="fp-data-stat-value">500+</div>
              <div className="fp-data-stat-label">Incentive Programs</div>
            </div>
            <div className="fp-data-stat">
              <div className="fp-data-stat-icon">
                <FileCheck size={24} />
              </div>
              <div className="fp-data-stat-value">2,500+</div>
              <div className="fp-data-stat-label">AHJ Jurisdictions</div>
            </div>
            <div className="fp-data-stat">
              <div className="fp-data-stat-icon">
                <MapPin size={24} />
              </div>
              <div className="fp-data-stat-value">356</div>
              <div className="fp-data-stat-label">Zip Code Regions</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="fp-cta">
        <div className="fp-cta-content">
          <div
            className="fp-section-label"
            style={{ justifyContent: "center" }}
          >
            <Zap size={14} />
            Ready to get started?
          </div>
          <h2 className="fp-cta-title">See SolarOS in action</h2>
          <p className="fp-cta-desc">
            Start automating your solar installations today. Free tier available
            for new installers and sales teams.
          </p>
          <div>
            <Link to="/get-started" className="fp-btn-primary">
              Get Started Free
              <ArrowRight size={18} />
            </Link>
            <Link to="/api-docs" className="fp-btn-secondary">
              API Documentation
              <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="fp-footer">
        <div className="container">
          <div className="fp-footer-links">
            <Link to="/">Home</Link>
            <Link to="/features">Features</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/about">About</Link>
          </div>
          <p className="fp-footer-copy">
            &copy; 2026 SolarOS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
