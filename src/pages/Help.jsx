import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  HelpCircle,
  BookOpen,
  Search,
  ChevronDown,
  Users,
  Zap,
  Shield,
  Wrench,
  ArrowRight,
  Mail,
  Phone,
  Code,
  DollarSign,
  FileCheck,
  Calendar,
  ClipboardCheck,
  MessageSquare,
  Key,
  ShoppingCart,
  Award,
  UserCheck,
  BarChart3,
  Receipt,
  Globe,
  Bot,
  Clock,
} from "lucide-react";
import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";

const FAQ_ITEMS = [
  {
    q: "What is SolarOS?",
    a: "SolarOS is a full solar installation management platform that covers the entire lifecycle from lead intake to grid interconnection. It includes lead management, solar estimates, automated permitting, scheduling, install quality control, invoicing, an open marketplace for contractors, compliance checking, and a developer API -- all in one system.",
  },
  {
    q: "How do I create a lead?",
    a: 'From your Dashboard, navigate to Leads and click "Create Lead." Fill in the customer name, address, contact info, and any notes. Leads are automatically scored and can be assigned to sales reps or installers. You can also ingest leads via the API using the leadWebhook endpoint.',
  },
  {
    q: "How do I generate a solar estimate?",
    a: "Go to Dashboard > Estimates. Enter the property address and system preferences. SolarOS pulls real utility rates, solar irradiance data, and available incentives for that location to generate a savings projection. Estimates can also be created programmatically via the solarEstimate API endpoint.",
  },
  {
    q: "How do subscriptions work?",
    a: "SolarOS offers three subscription tiers: Starter ($79/mo) includes 50 leads and 1,000 API calls, Professional ($149/mo) includes 200 leads and 10,000 API calls, and Enterprise ($299/mo) includes unlimited leads and 100,000 API calls. All tiers include access to the compliance engine, marketplace, and developer API. Manage your subscription from Dashboard > Billing.",
  },
  {
    q: "How do I manage API keys?",
    a: "Installer and admin users can manage API keys from Dashboard > API Keys or Admin > API Keys. You can create new keys with specific scopes (e.g., read_leads, read_solar, write_marketplace), set rate limits, rotate keys, and view usage statistics. Keys use the format pk_test_[48 hex chars] for development and pk_live_[48 hex chars] for production.",
  },
  {
    q: "What is the credit marketplace?",
    a: "The credit marketplace is a platform for transferring solar tax credits under IRA Section 6418. Since the residential ITC ended in January 2026, TPO (third-party ownership) installations can still claim the commercial ITC. The marketplace connects credit sellers with buyers, includes audit trails, and supports insurance-backed transactions.",
  },
  {
    q: "How does the referral program work?",
    a: "Share your unique referral link with homeowners. When a referred customer completes a solar installation, you earn a commission. Track your referrals, clicks, and payouts from Dashboard > Referrals or Portal > Referrals. Payouts are processed weekly and you receive SMS notifications when rewards are earned.",
  },
  {
    q: "How do I submit a site survey?",
    a: "Homeowners can submit a DIY site survey from Portal > Survey, which includes uploading photos of their roof, electrical panel, and utility meter. Installers access surveys from Dashboard > Survey, where they can review submissions, add professional measurements, and trigger the next pipeline stage (CAD design).",
  },
  {
    q: "What is the AI task engine?",
    a: "The AI task engine is SolarOS's automation layer. For each stage of the installation pipeline, AI attempts the task first (e.g., generating a permit package, matching an installer). If it cannot complete the task or confidence is low, it escalates to a human. Every human resolution becomes training data, so the system improves over time.",
  },
  {
    q: "How do I check permit status?",
    a: "Go to Dashboard > Permits to see all active permits with real-time status tracking. Each permit shows the AHJ (Authority Having Jurisdiction), submission date, current status, and any required documents. SolarOS tracks permit requirements by county and auto-generates permit packages when the design stage is approved.",
  },
];

const ROLE_CARDS = [
  {
    role: "Admin",
    icon: Shield,
    color: "#8b5cf6",
    items: [
      "Full platform oversight and configuration",
      "Manage users, billing, and API keys",
      "View analytics, SMS logs, and compliance reports",
      "Configure webhooks and system settings",
    ],
  },
  {
    role: "Installer",
    icon: Wrench,
    color: "#10b981",
    items: [
      "Manage projects through the 10-stage pipeline",
      "Create estimates, submit permits, schedule installs",
      "Bid on marketplace tasks and track SLA status",
      "Access equipment database and compliance tools",
    ],
  },
  {
    role: "Sales",
    icon: BarChart3,
    color: "#3b82f6",
    items: [
      "Manage leads and track conversion pipeline",
      "Create and send proposals to homeowners",
      "View territory assignments and performance metrics",
      "Earn commissions on closed deals",
    ],
  },
  {
    role: "Customer",
    icon: UserCheck,
    color: "#f59e0b",
    items: [
      "Track your solar project in real time",
      "Submit site surveys and upload photos",
      "View invoices, savings, and financing options",
      "Refer friends and earn rewards",
    ],
  },
];

const FEATURES = [
  { icon: Users, name: "Leads", desc: "Lead scoring and assignment" },
  { icon: DollarSign, name: "Estimates", desc: "Solar savings projections" },
  { icon: FileCheck, name: "Permits", desc: "AHJ tracking and packages" },
  { icon: Calendar, name: "Scheduling", desc: "Install crew coordination" },
  {
    icon: ClipboardCheck,
    name: "Install QC",
    desc: "Photo-based quality checks",
  },
  { icon: Receipt, name: "Invoicing", desc: "ACH invoicing via Mercury" },
  { icon: MessageSquare, name: "SMS", desc: "Automated Twilio notifications" },
  { icon: Key, name: "API", desc: "30+ REST endpoints" },
  { icon: ShoppingCart, name: "Marketplace", desc: "Open contractor bidding" },
  { icon: Award, name: "Credits", desc: "IRA 6418 tax credit transfers" },
];

function FaqItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="hp-faq-item" onClick={() => setOpen(!open)}>
      <div className="hp-faq-q">
        <span>{item.q}</span>
        <ChevronDown
          size={18}
          className={`hp-faq-chevron ${open ? "hp-faq-chevron-open" : ""}`}
        />
      </div>
      <div className={`hp-faq-a ${open ? "hp-faq-a-open" : ""}`}>
        <p>{item.a}</p>
      </div>
    </div>
  );
}

export default function Help() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaq = useMemo(() => {
    if (!searchQuery.trim()) return FAQ_ITEMS;
    const q = searchQuery.toLowerCase();
    return FAQ_ITEMS.filter(
      (item) =>
        item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  return (
    <div className="help-page">
      <style>{`
        .help-page {
          background: #0a0a0f;
          min-height: 100vh;
          color: #ffffff;
          overflow-x: hidden;
          font-family: 'Inter', -apple-system, sans-serif;
        }

        /* HERO */
        .hp-hero {
          padding: 160px 40px 80px;
          text-align: center;
          position: relative;
        }

        .hp-hero::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(ellipse 70% 50% at 50% 0%, rgba(16, 185, 129, 0.08) 0%, transparent 60%);
        }

        .hp-hero-content {
          max-width: 800px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .hp-hero-label {
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

        .hp-hero-title {
          font-size: clamp(2.5rem, 5vw, 4rem);
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 24px;
          letter-spacing: -0.03em;
        }

        .hp-hero-title .highlight {
          background: linear-gradient(135deg, #10b981, #34d399, #6ee7b7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hp-hero-desc {
          font-size: 1.2rem;
          color: rgba(255,255,255,0.55);
          line-height: 1.8;
          max-width: 640px;
          margin: 0 auto 40px;
        }

        .hp-search-wrap {
          max-width: 560px;
          margin: 0 auto;
          position: relative;
        }

        .hp-search-wrap svg {
          position: absolute;
          left: 18px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.3);
          pointer-events: none;
        }

        .hp-search-input {
          width: 100%;
          padding: 16px 20px 16px 50px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          color: #fff;
          font-size: 1rem;
          font-family: inherit;
          outline: none;
          transition: all 0.3s;
          box-sizing: border-box;
        }

        .hp-search-input::placeholder {
          color: rgba(255,255,255,0.3);
        }

        .hp-search-input:focus {
          border-color: rgba(16, 185, 129, 0.4);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        /* COMMON */
        .hp-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 40px;
        }

        .hp-section-label {
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

        .hp-section-title {
          font-size: clamp(1.8rem, 3.5vw, 2.5rem);
          font-weight: 800;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .hp-section-desc {
          font-size: 1.1rem;
          color: rgba(255,255,255,0.5);
          line-height: 1.7;
          max-width: 600px;
        }

        /* QUICK START */
        .hp-quickstart {
          padding: 100px 0;
          background: #0f1419;
        }

        .hp-role-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          margin-top: 48px;
        }

        .hp-role-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 32px 24px;
          transition: all 0.3s ease;
        }

        .hp-role-card:hover {
          border-color: rgba(16, 185, 129, 0.2);
          transform: translateY(-4px);
        }

        .hp-role-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .hp-role-name {
          font-size: 1.15rem;
          font-weight: 700;
          margin-bottom: 16px;
        }

        .hp-role-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .hp-role-list li {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.5);
          line-height: 1.5;
          padding-left: 16px;
          position: relative;
        }

        .hp-role-list li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 8px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.5);
        }

        /* FAQ */
        .hp-faq-section {
          padding: 100px 0;
          background: #0a0a0f;
        }

        .hp-faq-list {
          max-width: 800px;
          margin: 48px auto 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .hp-faq-item {
          background: linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s;
          overflow: hidden;
        }

        .hp-faq-item:hover {
          border-color: rgba(16, 185, 129, 0.15);
        }

        .hp-faq-q {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          font-weight: 600;
          font-size: 1rem;
          user-select: none;
        }

        .hp-faq-chevron {
          color: rgba(255,255,255,0.3);
          transition: transform 0.3s ease;
          flex-shrink: 0;
          margin-left: 16px;
        }

        .hp-faq-chevron-open {
          transform: rotate(180deg);
          color: #10b981;
        }

        .hp-faq-a {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.35s ease, padding 0.35s ease;
          padding: 0 24px;
        }

        .hp-faq-a-open {
          max-height: 300px;
          padding: 0 24px 20px;
        }

        .hp-faq-a p {
          font-size: 0.92rem;
          color: rgba(255,255,255,0.5);
          line-height: 1.8;
          margin: 0;
        }

        .hp-faq-empty {
          text-align: center;
          color: rgba(255,255,255,0.35);
          padding: 40px 0;
          font-size: 1rem;
        }

        /* FEATURES */
        .hp-features-section {
          padding: 100px 0;
          background: #0f1419;
        }

        .hp-features-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 20px;
          margin-top: 48px;
        }

        .hp-feature-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 28px 20px;
          text-align: center;
          transition: all 0.3s;
        }

        .hp-feature-card:hover {
          border-color: rgba(16, 185, 129, 0.2);
          transform: translateY(-3px);
        }

        .hp-feature-icon {
          color: #10b981;
          margin-bottom: 14px;
        }

        .hp-feature-name {
          font-size: 0.95rem;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .hp-feature-desc {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.4);
          line-height: 1.5;
        }

        /* SUPPORT */
        .hp-support-section {
          padding: 100px 0;
          background: #0a0a0f;
        }

        .hp-support-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          margin-top: 48px;
        }

        .hp-support-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 32px 24px;
          text-align: center;
          transition: all 0.3s;
        }

        .hp-support-card:hover {
          border-color: rgba(16, 185, 129, 0.15);
        }

        .hp-support-icon {
          color: #10b981;
          margin-bottom: 16px;
        }

        .hp-support-title {
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .hp-support-value {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.5);
          line-height: 1.6;
        }

        .hp-support-value a {
          color: #10b981;
          text-decoration: none;
          font-weight: 600;
        }

        .hp-support-value a:hover {
          text-decoration: underline;
        }

        /* CTA */
        .hp-cta {
          padding: 120px 0;
          text-align: center;
          position: relative;
          background: #0f1419;
        }

        .hp-cta::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(ellipse 60% 50% at 50% 50%, rgba(16, 185, 129, 0.08) 0%, transparent 60%);
        }

        .hp-cta-content {
          position: relative;
          z-index: 1;
        }

        .hp-cta-title {
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 800;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .hp-cta-desc {
          font-size: 1.1rem;
          color: rgba(255,255,255,0.5);
          margin-bottom: 40px;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }

        .hp-btn-primary {
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

        .hp-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 60px rgba(16, 185, 129, 0.5);
        }

        /* RESPONSIVE */
        @media (max-width: 1024px) {
          .hp-role-grid {
            grid-template-columns: 1fr 1fr;
          }

          .hp-features-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .hp-support-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 768px) {
          .hp-hero {
            padding: 120px 20px 60px;
          }

          .hp-container {
            padding: 0 20px;
          }

          .hp-role-grid {
            grid-template-columns: 1fr;
          }

          .hp-features-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .hp-support-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <PublicNav />

      {/* HERO */}
      <section className="hp-hero">
        <div className="hp-hero-content">
          <div className="hp-hero-label">
            <HelpCircle size={14} />
            Help Center
          </div>
          <h1 className="hp-hero-title">
            SolarOS <span className="highlight">Help Center</span>
          </h1>
          <p className="hp-hero-desc">
            Find answers to common questions, learn how each role works, and get
            the most out of the platform.
          </p>
          <div className="hp-search-wrap">
            <Search size={20} />
            <input
              type="text"
              className="hp-search-input"
              placeholder="Search help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* QUICK START */}
      <section className="hp-quickstart">
        <div className="hp-container">
          <div style={{ textAlign: "center" }}>
            <div
              className="hp-section-label"
              style={{ justifyContent: "center" }}
            >
              <BookOpen size={14} />
              Quick Start Guide
            </div>
            <h2 className="hp-section-title">Get started with your role</h2>
            <p className="hp-section-desc" style={{ margin: "0 auto" }}>
              SolarOS serves four user types. Here is what each role can do
              inside the platform.
            </p>
          </div>

          <div className="hp-role-grid">
            {ROLE_CARDS.map((card) => (
              <div key={card.role} className="hp-role-card">
                <div
                  className="hp-role-icon"
                  style={{
                    background: `linear-gradient(135deg, ${card.color}22, ${card.color}0a)`,
                    color: card.color,
                  }}
                >
                  <card.icon size={24} />
                </div>
                <h3 className="hp-role-name">{card.role}</h3>
                <ul className="hp-role-list">
                  {card.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="hp-faq-section">
        <div className="hp-container">
          <div style={{ textAlign: "center" }}>
            <div
              className="hp-section-label"
              style={{ justifyContent: "center" }}
            >
              <HelpCircle size={14} />
              FAQ
            </div>
            <h2 className="hp-section-title">Frequently asked questions</h2>
            <p className="hp-section-desc" style={{ margin: "0 auto" }}>
              Quick answers to the most common questions about SolarOS features,
              billing, and workflows.
            </p>
          </div>

          <div className="hp-faq-list">
            {filteredFaq.length === 0 ? (
              <div className="hp-faq-empty">
                No results found for "{searchQuery}". Try a different search
                term or{" "}
                <Link
                  to="/contact"
                  style={{ color: "#10b981", textDecoration: "none" }}
                >
                  contact support
                </Link>
                .
              </div>
            ) : (
              filteredFaq.map((item) => <FaqItem key={item.q} item={item} />)
            )}
          </div>
        </div>
      </section>

      {/* FEATURE GUIDE */}
      <section className="hp-features-section">
        <div className="hp-container">
          <div style={{ textAlign: "center" }}>
            <div
              className="hp-section-label"
              style={{ justifyContent: "center" }}
            >
              <Zap size={14} />
              Feature Guide
            </div>
            <h2 className="hp-section-title">Platform capabilities</h2>
            <p className="hp-section-desc" style={{ margin: "0 auto" }}>
              SolarOS covers the full solar installation lifecycle. Here is a
              quick overview of every major feature.
            </p>
          </div>

          <div className="hp-features-grid">
            {FEATURES.map((f) => (
              <div key={f.name} className="hp-feature-card">
                <div className="hp-feature-icon">
                  <f.icon size={24} />
                </div>
                <div className="hp-feature-name">{f.name}</div>
                <div className="hp-feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT / SUPPORT */}
      <section className="hp-support-section">
        <div className="hp-container">
          <div style={{ textAlign: "center" }}>
            <div
              className="hp-section-label"
              style={{ justifyContent: "center" }}
            >
              <Globe size={14} />
              Support
            </div>
            <h2 className="hp-section-title">Need more help?</h2>
            <p className="hp-section-desc" style={{ margin: "0 auto" }}>
              Our team is here to help you succeed. Reach out through any of
              these channels.
            </p>
          </div>

          <div className="hp-support-grid">
            <div className="hp-support-card">
              <div className="hp-support-icon">
                <Mail size={28} />
              </div>
              <h3 className="hp-support-title">Email Support</h3>
              <p className="hp-support-value">
                <a href="mailto:support@solarios.io">support@solarios.io</a>
              </p>
            </div>
            <div className="hp-support-card">
              <div className="hp-support-icon">
                <Phone size={28} />
              </div>
              <h3 className="hp-support-title">Phone</h3>
              <p className="hp-support-value">
                <a href="tel:+18005765277">(800) 576-5277</a>
                <br />
                Mon - Fri, 8 AM - 6 PM CST
              </p>
            </div>
            <div className="hp-support-card">
              <div className="hp-support-icon">
                <Code size={28} />
              </div>
              <h3 className="hp-support-title">API Documentation</h3>
              <p className="hp-support-value">
                <Link
                  to="/api-docs"
                  style={{
                    color: "#10b981",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  View API Docs
                </Link>
              </p>
            </div>
            <div className="hp-support-card">
              <div className="hp-support-icon">
                <Clock size={28} />
              </div>
              <h3 className="hp-support-title">Response Time</h3>
              <p className="hp-support-value">
                We typically respond within a few hours during business days.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="hp-cta">
        <div className="hp-cta-content">
          <h2 className="hp-cta-title">Still have questions?</h2>
          <p className="hp-cta-desc">
            Schedule a live demo and our team will walk you through every
            feature of the platform.
          </p>
          <Link to="/contact" className="hp-btn-primary">
            Contact Us
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
