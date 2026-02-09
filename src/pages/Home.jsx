import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Zap,
  Shield,
  ArrowRight,
  Sun,
  Users,
  Wrench,
  TrendingUp,
  CheckCircle2,
  Globe,
  ClipboardCheck,
  Timer,
  Package,
  FileCheck,
  Gavel,
  Calendar,
  BarChart3,
  DollarSign,
  MapPin,
  ChevronRight,
  Star,
  Lock,
  Code,
  Layers,
  Target,
  Truck,
  Home as HomeIcon,
  Building2,
  Briefcase,
  Award,
  Activity,
} from "lucide-react";
import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";

export default function Home() {
  const [showContent, setShowContent] = useState(false);
  const [visibleSections, setVisibleSections] = useState(new Set());
  const sectionRefs = useRef({});

  useEffect(() => {
    setTimeout(() => setShowContent(true), 400);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.15 },
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
    <div className="home-page">
      <style>{`
        .home-page {
          background: #0a0a0f;
          min-height: 100vh;
          color: #ffffff;
          overflow-x: hidden;
          font-family: 'Inter', -apple-system, sans-serif;
        }

        /* Header handled by PublicNav component */

        /* ============================================
           HERO
           ============================================ */
        .hero-section {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 120px 20px 80px;
        }

        .hero-bg-gradient {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background:
            radial-gradient(ellipse 80% 60% at 50% 0%, rgba(16, 185, 129, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 20%, rgba(16, 185, 129, 0.06) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 20% 80%, rgba(16, 185, 129, 0.04) 0%, transparent 50%);
        }

        .hero-grid-bg {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 80% 60% at 50% 30%, black, transparent);
        }

        .hero-content {
          position: relative;
          z-index: 10;
          text-align: center;
          max-width: 900px;
        }

        .hero-badge {
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
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .hero-badge.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .hero-tagline {
          font-size: clamp(3rem, 7vw, 5rem);
          font-weight: 800;
          line-height: 1.05;
          margin-bottom: 24px;
          letter-spacing: -0.03em;
          opacity: 0;
          transform: translateY(30px);
          transition: all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.1s;
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
        }

        .hero-subtitle {
          font-size: clamp(1.05rem, 2vw, 1.3rem);
          color: rgba(255,255,255,0.6);
          max-width: 640px;
          margin: 0 auto 48px;
          line-height: 1.7;
          opacity: 0;
          transform: translateY(20px);
          transition: all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s;
        }

        .hero-subtitle.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .hero-buttons {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          flex-wrap: wrap;
          opacity: 0;
          transform: translateY(20px);
          transition: all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.3s;
        }

        .hero-buttons.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .btn-primary {
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

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 60px rgba(16, 185, 129, 0.5);
        }

        .btn-secondary {
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
        }

        .btn-secondary:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.2);
          transform: translateY(-2px);
        }

        /* ============================================
           STATS BAR
           ============================================ */
        .stats-bar {
          padding: 0;
          position: relative;
        }

        .stats-bar-inner {
          max-width: 1000px;
          margin: 0 auto;
          padding: 0 40px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          border-top: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .stats-bar-item {
          text-align: center;
          padding: 40px 20px;
          position: relative;
        }

        .stats-bar-item:not(:last-child)::after {
          content: '';
          position: absolute;
          right: 0;
          top: 25%;
          height: 50%;
          width: 1px;
          background: rgba(255,255,255,0.06);
        }

        .stats-bar-value {
          font-size: 2rem;
          font-weight: 800;
          background: linear-gradient(135deg, #10b981, #34d399);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 4px;
        }

        .stats-bar-label {
          color: rgba(255,255,255,0.5);
          font-size: 0.9rem;
          font-weight: 500;
        }

        /* ============================================
           SECTION COMMON
           ============================================ */
        .section-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 40px;
        }

        .section-animate {
          opacity: 0;
          transform: translateY(40px);
          transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .section-animate.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .section-label {
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

        .section-title {
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 800;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .section-subtitle {
          font-size: 1.15rem;
          color: rgba(255,255,255,0.5);
          max-width: 600px;
          line-height: 1.7;
        }

        .section-header {
          text-align: center;
          margin-bottom: 64px;
        }

        .section-header .section-subtitle {
          margin: 0 auto;
        }

        /* ============================================
           HOW IT WORKS
           ============================================ */
        .how-section {
          padding: 120px 0;
          background: linear-gradient(to bottom, #0a0a0f, #0f1419);
        }

        .how-steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
          position: relative;
        }

        .how-steps::before {
          content: '';
          position: absolute;
          top: 48px;
          left: 15%;
          right: 15%;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.3), rgba(16, 185, 129, 0.3), transparent);
        }

        .how-step {
          text-align: center;
          position: relative;
          padding: 0 16px;
        }

        .how-step-number {
          width: 96px;
          height: 96px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05));
          border: 2px solid rgba(16, 185, 129, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          position: relative;
          z-index: 2;
          background-color: #0f1419;
        }

        .how-step-number svg {
          color: #10b981;
        }

        .how-step-title {
          font-size: 1.2rem;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .how-step-desc {
          color: rgba(255,255,255,0.5);
          font-size: 0.95rem;
          line-height: 1.6;
        }

        /* ============================================
           AUDIENCE SECTIONS
           ============================================ */
        .audience-section {
          padding: 120px 0;
          position: relative;
        }

        .audience-section.alt-bg {
          background: #0f1419;
        }

        .audience-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
        }

        .audience-grid.reverse {
          direction: rtl;
        }

        .audience-grid.reverse > * {
          direction: ltr;
        }

        .audience-text {
          max-width: 520px;
        }

        .audience-visual {
          background: linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 24px;
          padding: 48px;
          position: relative;
          overflow: hidden;
        }

        .audience-visual::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, transparent 60%);
        }

        .audience-feature-list {
          list-style: none;
          padding: 0;
          margin: 24px 0 32px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .audience-feature-list li {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          color: rgba(255,255,255,0.7);
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .audience-feature-list li svg {
          color: #10b981;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .visual-stat-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          position: relative;
          z-index: 1;
        }

        .visual-stat {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 24px;
          text-align: center;
        }

        .visual-stat-icon {
          color: #10b981;
          margin-bottom: 12px;
        }

        .visual-stat-value {
          font-size: 1.8rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: 4px;
        }

        .visual-stat-label {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.4);
          font-weight: 500;
        }

        /* ============================================
           FEATURES GRID
           ============================================ */
        .features-section {
          padding: 120px 0;
          background: #0a0a0f;
          position: relative;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .feature-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 36px 28px;
          transition: all 0.4s ease;
        }

        .feature-card:hover {
          transform: translateY(-4px);
          border-color: rgba(16, 185, 129, 0.2);
          box-shadow: 0 20px 60px rgba(0,0,0,0.2), 0 0 40px rgba(16, 185, 129, 0.05);
        }

        .feature-icon {
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

        .feature-title {
          font-size: 1.1rem;
          font-weight: 700;
          margin-bottom: 8px;
          letter-spacing: -0.01em;
        }

        .feature-desc {
          color: rgba(255,255,255,0.45);
          font-size: 0.9rem;
          line-height: 1.6;
        }

        /* ============================================
           MARKETPLACE PREVIEW
           ============================================ */
        .marketplace-section {
          padding: 120px 0;
          background: #0f1419;
        }

        .marketplace-preview {
          background: linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 24px;
          overflow: hidden;
          margin-top: 48px;
        }

        .mp-header {
          padding: 20px 28px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .mp-header-title {
          font-weight: 700;
          font-size: 0.95rem;
        }

        .mp-header-badge {
          padding: 4px 12px;
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border-radius: 100px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .mp-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 120px;
          gap: 16px;
          padding: 18px 28px;
          align-items: center;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          transition: background 0.2s;
        }

        .mp-row:hover {
          background: rgba(255,255,255,0.02);
        }

        .mp-row:last-child {
          border-bottom: none;
        }

        .mp-task-name {
          font-weight: 600;
          font-size: 0.9rem;
        }

        .mp-task-type {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.4);
          margin-top: 2px;
        }

        .mp-cell {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.5);
        }

        .mp-cell-value {
          color: #fff;
          font-weight: 600;
        }

        .mp-bid-btn {
          padding: 8px 16px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #10b981;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }

        .mp-bid-btn:hover {
          background: rgba(16, 185, 129, 0.2);
        }

        /* ============================================
           COVERAGE
           ============================================ */
        .coverage-section {
          padding: 120px 0;
          background: #0a0a0f;
          position: relative;
        }

        .coverage-visual {
          margin-top: 48px;
          background: linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 24px;
          padding: 64px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .coverage-visual::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(ellipse 70% 50% at 50% 50%, rgba(16, 185, 129, 0.08) 0%, transparent 60%);
        }

        .coverage-states {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
          margin-top: 32px;
          position: relative;
          z-index: 1;
        }

        .coverage-state {
          padding: 6px 14px;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.15);
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          color: rgba(255,255,255,0.6);
        }

        .coverage-big-number {
          font-size: clamp(3rem, 8vw, 6rem);
          font-weight: 900;
          background: linear-gradient(135deg, #10b981, #34d399);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          position: relative;
          z-index: 1;
        }

        .coverage-big-label {
          font-size: 1.3rem;
          color: rgba(255,255,255,0.5);
          font-weight: 500;
          position: relative;
          z-index: 1;
        }

        /* ============================================
           CTA
           ============================================ */
        .cta-section {
          padding: 140px 0;
          text-align: center;
          position: relative;
          background: #0f1419;
        }

        .cta-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(ellipse 60% 50% at 50% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 60%);
        }

        .cta-content {
          position: relative;
          z-index: 1;
        }

        .cta-title {
          font-size: clamp(2rem, 5vw, 3.5rem);
          font-weight: 800;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .cta-subtitle {
          font-size: 1.15rem;
          color: rgba(255,255,255,0.5);
          margin-bottom: 40px;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }

        .cta-buttons {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        /* Footer handled by PublicFooter component */

        /* ============================================
           RESPONSIVE
           ============================================ */
        @media (max-width: 1024px) {
          .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .audience-grid {
            grid-template-columns: 1fr;
            gap: 48px;
          }

          .audience-grid.reverse {
            direction: ltr;
          }

          /* Footer 1024px responsive handled by PublicFooter */
        }

        @media (max-width: 768px) {

          /* Nav responsive handled by PublicNav */

          .hero-section {
            padding: 100px 20px 60px;
          }

          .stats-bar-inner {
            grid-template-columns: 1fr;
            padding: 0 20px;
          }

          .stats-bar-item:not(:last-child)::after {
            display: none;
          }

          .stats-bar-item {
            padding: 24px 20px;
          }

          .how-steps {
            grid-template-columns: 1fr;
            gap: 40px;
          }

          .how-steps::before {
            display: none;
          }

          .features-grid {
            grid-template-columns: 1fr;
          }

          .mp-row {
            grid-template-columns: 1fr;
            gap: 8px;
            padding: 16px 20px;
          }

          .mp-cell:nth-child(2),
          .mp-cell:nth-child(3) {
            display: none;
          }

          .coverage-visual {
            padding: 40px 24px;
          }

          /* Footer responsive handled by PublicFooter */

          .section-container {
            padding: 0 20px;
          }
        }
      `}</style>

      <PublicNav />

      {/* ================================================
          HERO
          ================================================ */}
      <section className="hero-section">
        <div className="hero-bg-gradient" />
        <div className="hero-grid-bg" />
        <div className="hero-content">
          <div className={`hero-badge ${showContent ? "visible" : ""}`}>
            <Zap size={14} />
            Now automating solar installations nationwide
          </div>
          <h1 className={`hero-tagline ${showContent ? "visible" : ""}`}>
            The Operating System
            <br />
            <span className="highlight">for Solar</span>
          </h1>
          <p className={`hero-subtitle ${showContent ? "visible" : ""}`}>
            Automate the entire solar lifecycle from lead to interconnection.
            One platform for homeowners, installers, and sales teams.
          </p>
          <div className={`hero-buttons ${showContent ? "visible" : ""}`}>
            <Link to="/get-started" className="btn-primary">
              Get Started Free
              <ArrowRight size={18} />
            </Link>
            <Link to="/features" className="btn-secondary">
              For Installers
              <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================
          STATS BAR
          ================================================ */}
      <div className="stats-bar">
        <div className="stats-bar-inner">
          <div className="stats-bar-item">
            <div className="stats-bar-value">10</div>
            <div className="stats-bar-label">Automated Stages</div>
          </div>
          <div className="stats-bar-item">
            <div className="stats-bar-value">50-State</div>
            <div className="stats-bar-label">Coverage</div>
          </div>
          <div className="stats-bar-item">
            <div className="stats-bar-value">Zero</div>
            <div className="stats-bar-label">Manual Handoffs</div>
          </div>
        </div>
      </div>

      {/* ================================================
          HOW IT WORKS
          ================================================ */}
      <section
        id="how-it-works"
        ref={setSectionRef("how-it-works")}
        className="how-section"
      >
        <div className="section-container">
          <div
            className={`section-header section-animate ${isVisible("how-it-works") ? "visible" : ""}`}
          >
            <div className="section-label">
              <Layers size={14} />
              How It Works
            </div>
            <h2 className="section-title">Three steps to solar, simplified</h2>
            <p className="section-subtitle">
              From signup to a fully installed system, SolarOS automates every
              stage of the process.
            </p>
          </div>

          <div
            className={`how-steps section-animate ${isVisible("how-it-works") ? "visible" : ""}`}
          >
            <div className="how-step">
              <div className="how-step-number">
                <Users size={36} />
              </div>
              <h3 className="how-step-title">Customer Signs Up</h3>
              <p className="how-step-desc">
                Homeowner qualifies online in under 2 minutes. AI scores the
                lead and enters it into the automated pipeline.
              </p>
            </div>

            <div className="how-step">
              <div className="how-step-number">
                <Target size={36} />
              </div>
              <h3 className="how-step-title">AI Matches Workers</h3>
              <p className="how-step-desc">
                Smart bidding matches the right surveyors, designers, and
                installers based on location, rating, and availability.
              </p>
            </div>

            <div className="how-step">
              <div className="how-step-number">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="how-step-title">Project Completes</h3>
              <p className="how-step-desc">
                Every stage from survey to PTO fires automatically. Quality
                checks, SLAs, and compliance baked in.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================
          FOR HOMEOWNERS
          ================================================ */}
      <section
        id="homeowners"
        ref={setSectionRef("homeowners")}
        className="audience-section alt-bg"
      >
        <div className="section-container">
          <div
            className={`audience-grid section-animate ${isVisible("homeowners") ? "visible" : ""}`}
          >
            <div className="audience-text">
              <div className="section-label">
                <HomeIcon size={14} />
                For Homeowners
              </div>
              <h2 className="section-title">Solar, made simple</h2>
              <p className="section-subtitle" style={{ marginBottom: 0 }}>
                Sign up online, track every stage of your installation, and take
                control of your energy future.
              </p>
              <ul className="audience-feature-list">
                <li>
                  <CheckCircle2 size={18} />
                  <span>2-minute online qualification check</span>
                </li>
                <li>
                  <CheckCircle2 size={18} />
                  <span>Real-time project tracking portal</span>
                </li>
                <li>
                  <CheckCircle2 size={18} />
                  <span>DIY site survey option with AI photo analysis</span>
                </li>
                <li>
                  <CheckCircle2 size={18} />
                  <span>Tax credit tracking and savings dashboard</span>
                </li>
              </ul>
              <Link
                to="/qualify"
                className="btn-primary"
                style={{ fontSize: "0.9rem", padding: "12px 24px" }}
              >
                Check Eligibility
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="audience-visual">
              <div className="visual-stat-grid">
                <div className="visual-stat">
                  <div className="visual-stat-icon">
                    <Sun size={24} />
                  </div>
                  <div className="visual-stat-value">8.5kW</div>
                  <div className="visual-stat-label">System Size</div>
                </div>
                <div className="visual-stat">
                  <div className="visual-stat-icon">
                    <DollarSign size={24} />
                  </div>
                  <div className="visual-stat-value">$1,842</div>
                  <div className="visual-stat-label">Annual Savings</div>
                </div>
                <div className="visual-stat">
                  <div className="visual-stat-icon">
                    <Activity size={24} />
                  </div>
                  <div className="visual-stat-value">97%</div>
                  <div className="visual-stat-label">Offset</div>
                </div>
                <div className="visual-stat">
                  <div className="visual-stat-icon">
                    <Timer size={24} />
                  </div>
                  <div className="visual-stat-value">6.2yr</div>
                  <div className="visual-stat-label">Payback Period</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================
          FOR INSTALLERS
          ================================================ */}
      <section
        id="installers"
        ref={setSectionRef("installers")}
        className="audience-section"
      >
        <div className="section-container">
          <div
            className={`audience-grid reverse section-animate ${isVisible("installers") ? "visible" : ""}`}
          >
            <div className="audience-text">
              <div className="section-label">
                <Wrench size={14} />
                For Installers
              </div>
              <h2 className="section-title">
                An open marketplace for solar work
              </h2>
              <p className="section-subtitle" style={{ marginBottom: 0 }}>
                Bid on tasks in your area, build your reputation, and grow your
                business on your own schedule.
              </p>
              <ul className="audience-feature-list">
                <li>
                  <CheckCircle2 size={18} />
                  <span>
                    Bid on surveys, designs, installs, and inspections
                  </span>
                </li>
                <li>
                  <CheckCircle2 size={18} />
                  <span>
                    Smart matching by location, rating, and experience
                  </span>
                </li>
                <li>
                  <CheckCircle2 size={18} />
                  <span>
                    Flexible scheduling with SLA-backed reliability scores
                  </span>
                </li>
                <li>
                  <CheckCircle2 size={18} />
                  <span>Equipment database with compliance pre-checks</span>
                </li>
              </ul>
              <Link
                to="/get-started"
                className="btn-primary"
                style={{ fontSize: "0.9rem", padding: "12px 24px" }}
              >
                Join as Installer
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="audience-visual">
              <div className="visual-stat-grid">
                <div className="visual-stat">
                  <div className="visual-stat-icon">
                    <Truck size={24} />
                  </div>
                  <div className="visual-stat-value">10</div>
                  <div className="visual-stat-label">Task Types</div>
                </div>
                <div className="visual-stat">
                  <div className="visual-stat-icon">
                    <Star size={24} />
                  </div>
                  <div className="visual-stat-value">4.9</div>
                  <div className="visual-stat-label">Avg Rating</div>
                </div>
                <div className="visual-stat">
                  <div className="visual-stat-icon">
                    <MapPin size={24} />
                  </div>
                  <div className="visual-stat-value">25mi</div>
                  <div className="visual-stat-label">Radius Match</div>
                </div>
                <div className="visual-stat">
                  <div className="visual-stat-icon">
                    <Award size={24} />
                  </div>
                  <div className="visual-stat-value">98%</div>
                  <div className="visual-stat-label">SLA Compliance</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================
          FOR SALES REPS
          ================================================ */}
      <section
        id="sales"
        ref={setSectionRef("sales")}
        className="audience-section alt-bg"
      >
        <div className="section-container">
          <div
            className={`audience-grid section-animate ${isVisible("sales") ? "visible" : ""}`}
          >
            <div className="audience-text">
              <div className="section-label">
                <Briefcase size={14} />
                For Sales Reps
              </div>
              <h2 className="section-title">
                Close the deal, we handle the rest
              </h2>
              <p className="section-subtitle" style={{ marginBottom: 0 }}>
                Manage your pipeline, track commissions, and let the platform
                automate everything after the close.
              </p>
              <ul className="audience-feature-list">
                <li>
                  <CheckCircle2 size={18} />
                  <span>AI-scored leads with priority ranking</span>
                </li>
                <li>
                  <CheckCircle2 size={18} />
                  <span>Commission tracking and territory management</span>
                </li>
                <li>
                  <CheckCircle2 size={18} />
                  <span>One-click proposal generation with pricing</span>
                </li>
                <li>
                  <CheckCircle2 size={18} />
                  <span>
                    Automated pipeline after close -- zero handoff friction
                  </span>
                </li>
              </ul>
              <Link
                to="/get-started"
                className="btn-primary"
                style={{ fontSize: "0.9rem", padding: "12px 24px" }}
              >
                Join Sales Team
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="audience-visual">
              <div className="visual-stat-grid">
                <div className="visual-stat">
                  <div className="visual-stat-icon">
                    <TrendingUp size={24} />
                  </div>
                  <div className="visual-stat-value">3.2x</div>
                  <div className="visual-stat-label">Close Rate Lift</div>
                </div>
                <div className="visual-stat">
                  <div className="visual-stat-icon">
                    <BarChart3 size={24} />
                  </div>
                  <div className="visual-stat-value">$12k</div>
                  <div className="visual-stat-label">Avg Commission</div>
                </div>
                <div className="visual-stat">
                  <div className="visual-stat-icon">
                    <Users size={24} />
                  </div>
                  <div className="visual-stat-value">200+</div>
                  <div className="visual-stat-label">Monthly Leads</div>
                </div>
                <div className="visual-stat">
                  <div className="visual-stat-icon">
                    <Timer size={24} />
                  </div>
                  <div className="visual-stat-value">&lt;5min</div>
                  <div className="visual-stat-label">Lead Response</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================
          FEATURES GRID
          ================================================ */}
      <section
        id="features-grid"
        ref={setSectionRef("features-grid")}
        className="features-section"
      >
        <div className="section-container">
          <div
            className={`section-header section-animate ${isVisible("features-grid") ? "visible" : ""}`}
          >
            <div className="section-label">
              <Zap size={14} />
              Platform Features
            </div>
            <h2 className="section-title">Everything you need, built in</h2>
            <p className="section-subtitle">
              A comprehensive platform that replaces spreadsheets, manual
              tracking, and fragmented tools.
            </p>
          </div>

          <div
            className={`features-grid section-animate ${isVisible("features-grid") ? "visible" : ""}`}
          >
            <div className="feature-card">
              <div className="feature-icon">
                <Package size={24} />
              </div>
              <h3 className="feature-title">Equipment Database</h3>
              <p className="feature-desc">
                9 categories of solar equipment with manufacturer specs,
                pricing, and real-time availability.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Shield size={24} />
              </div>
              <h3 className="feature-title">Compliance Engine</h3>
              <p className="feature-desc">
                Automated FEOC, ITC eligibility, domestic content, and tariff
                compliance checks for every project.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <TrendingUp size={24} />
              </div>
              <h3 className="feature-title">Smart Bidding</h3>
              <p className="feature-desc">
                7-factor scoring algorithm matches the best workers based on
                price, proximity, rating, and reliability.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <ClipboardCheck size={24} />
              </div>
              <h3 className="feature-title">SLA Enforcement</h3>
              <p className="feature-desc">
                Automated strike system with reliability scoring ensures
                deadlines are met and quality stays high.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <FileCheck size={24} />
              </div>
              <h3 className="feature-title">Permit Automation</h3>
              <p className="feature-desc">
                AHJ-specific requirements, document generation, and permit
                status tracking across jurisdictions.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Calendar size={24} />
              </div>
              <h3 className="feature-title">Smart Scheduling</h3>
              <p className="feature-desc">
                Coordinate surveys, installations, and inspections with
                availability matching and conflict detection.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Code size={24} />
              </div>
              <h3 className="feature-title">REST APIs</h3>
              <p className="feature-desc">
                Full API access for marketplace, projects, webhooks, and solar
                data with HMAC-signed security.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <DollarSign size={24} />
              </div>
              <h3 className="feature-title">Tax Credit Tracking</h3>
              <p className="feature-desc">
                ITC eligibility analysis, domestic content scoring, and
                transferable credit marketplace.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Globe size={24} />
              </div>
              <h3 className="feature-title">Nationwide Data</h3>
              <p className="feature-desc">
                Utility rates, incentive programs, net metering policies, and
                solar irradiance for all 50 states.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================
          MARKETPLACE PREVIEW
          ================================================ */}
      <section
        id="marketplace"
        ref={setSectionRef("marketplace")}
        className="marketplace-section"
      >
        <div className="section-container">
          <div
            className={`section-header section-animate ${isVisible("marketplace") ? "visible" : ""}`}
          >
            <div className="section-label">
              <Building2 size={14} />
              Open Marketplace
            </div>
            <h2 className="section-title">A bidding system that works</h2>
            <p className="section-subtitle">
              Tasks are posted, qualified workers bid, and AI selects the best
              match. Transparent pricing, enforced SLAs.
            </p>
          </div>

          <div
            className={`marketplace-preview section-animate ${isVisible("marketplace") ? "visible" : ""}`}
          >
            <div className="mp-header">
              <span className="mp-header-title">Active Listings</span>
              <span className="mp-header-badge">Live</span>
            </div>
            <div
              className="mp-row"
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                fontWeight: 600,
                fontSize: "0.8rem",
                color: "rgba(255,255,255,0.35)",
              }}
            >
              <span>Task</span>
              <span>Location</span>
              <span>Bids</span>
              <span>Budget</span>
              <span></span>
            </div>
            <div className="mp-row">
              <div>
                <div className="mp-task-name">Roof Site Survey</div>
                <div className="mp-task-type">Survey &bull; Residential</div>
              </div>
              <div className="mp-cell">Austin, TX</div>
              <div className="mp-cell">
                <span className="mp-cell-value">3</span> bids
              </div>
              <div className="mp-cell">
                <span className="mp-cell-value">$350</span>
              </div>
              <div className="mp-bid-btn">Place Bid</div>
            </div>
            <div className="mp-row">
              <div>
                <div className="mp-task-name">Panel Installation</div>
                <div className="mp-task-type">Install &bull; 8.5kW System</div>
              </div>
              <div className="mp-cell">Denver, CO</div>
              <div className="mp-cell">
                <span className="mp-cell-value">7</span> bids
              </div>
              <div className="mp-cell">
                <span className="mp-cell-value">$4,200</span>
              </div>
              <div className="mp-bid-btn">Place Bid</div>
            </div>
            <div className="mp-row">
              <div>
                <div className="mp-task-name">Electrical Inspection</div>
                <div className="mp-task-type">Inspection &bull; Final</div>
              </div>
              <div className="mp-cell">Phoenix, AZ</div>
              <div className="mp-cell">
                <span className="mp-cell-value">2</span> bids
              </div>
              <div className="mp-cell">
                <span className="mp-cell-value">$275</span>
              </div>
              <div className="mp-bid-btn">Place Bid</div>
            </div>
            <div className="mp-row">
              <div>
                <div className="mp-task-name">CAD Design Package</div>
                <div className="mp-task-type">Design &bull; Permit-Ready</div>
              </div>
              <div className="mp-cell">Orlando, FL</div>
              <div className="mp-cell">
                <span className="mp-cell-value">5</span> bids
              </div>
              <div className="mp-cell">
                <span className="mp-cell-value">$800</span>
              </div>
              <div className="mp-bid-btn">Place Bid</div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================
          COVERAGE MAP
          ================================================ */}
      <section
        id="coverage"
        ref={setSectionRef("coverage")}
        className="coverage-section"
      >
        <div className="section-container">
          <div
            className={`section-header section-animate ${isVisible("coverage") ? "visible" : ""}`}
          >
            <div className="section-label">
              <Globe size={14} />
              Nationwide Coverage
            </div>
            <h2 className="section-title">
              Every state. Every utility. Every incentive.
            </h2>
            <p className="section-subtitle">
              Our data engine covers utility rates, net metering policies,
              permitting requirements, and incentive programs across the entire
              country.
            </p>
          </div>

          <div
            className={`coverage-visual section-animate ${isVisible("coverage") ? "visible" : ""}`}
          >
            <div className="coverage-big-number">50</div>
            <div className="coverage-big-label">
              States with full data coverage
            </div>
            <div className="coverage-states">
              {[
                "AL",
                "AK",
                "AZ",
                "AR",
                "CA",
                "CO",
                "CT",
                "DE",
                "FL",
                "GA",
                "HI",
                "ID",
                "IL",
                "IN",
                "IA",
                "KS",
                "KY",
                "LA",
                "ME",
                "MD",
                "MA",
                "MI",
                "MN",
                "MS",
                "MO",
                "MT",
                "NE",
                "NV",
                "NH",
                "NJ",
                "NM",
                "NY",
                "NC",
                "ND",
                "OH",
                "OK",
                "OR",
                "PA",
                "RI",
                "SC",
                "SD",
                "TN",
                "TX",
                "UT",
                "VT",
                "VA",
                "WA",
                "WV",
                "WI",
                "WY",
              ].map((st) => (
                <span key={st} className="coverage-state">
                  {st}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================
          PRICING CTA
          ================================================ */}
      <section id="cta" ref={setSectionRef("cta")} className="cta-section">
        <div
          className={`cta-content section-animate ${isVisible("cta") ? "visible" : ""}`}
        >
          <div className="section-label" style={{ justifyContent: "center" }}>
            <Lock size={14} />
            Ready to Build?
          </div>
          <h2 className="cta-title">Start automating your solar business</h2>
          <p className="cta-subtitle">
            Join the platform that is replacing spreadsheets, phone calls, and
            manual coordination with a single automated system.
          </p>
          <div className="cta-buttons">
            <Link to="/get-started" className="btn-primary">
              Get Started Free
              <ArrowRight size={18} />
            </Link>
            <Link to="/pricing" className="btn-secondary">
              View Pricing
              <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
