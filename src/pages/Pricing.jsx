import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Sun,
  ArrowRight,
  Zap,
  Shield,
  Users,
  Code,
  Headphones,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";

const tiers = [
  {
    name: "Starter",
    price: 79,
    description: "For independent installers getting started with automation.",
    limits: {
      leads: "50 / mo",
      api: "1,000 / mo",
      compliance: "25 / mo",
    },
    features: [
      { text: "Basic lead management", included: true },
      { text: "API access", included: true },
      { text: "Equipment database", included: true },
      { text: "Email support", included: true },
      { text: "Smart bidding", included: false },
      { text: "Worker matching", included: false },
      { text: "SLA monitoring", included: false },
      { text: "Webhook integrations", included: false },
      { text: "Custom integrations", included: false },
      { text: "Dedicated account manager", included: false },
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    name: "Professional",
    price: 149,
    description:
      "For growing teams that need the full automation and bidding engine.",
    limits: {
      leads: "200 / mo",
      api: "10,000 / mo",
      compliance: "200 / mo",
    },
    features: [
      { text: "Everything in Starter", included: true },
      { text: "Smart bidding engine", included: true },
      { text: "Worker matching", included: true },
      { text: "SLA monitoring", included: true },
      { text: "Webhook integrations", included: true },
      { text: "Priority support", included: true },
      { text: "Custom integrations", included: false },
      { text: "Dedicated account manager", included: false },
      { text: "White-label options", included: false },
      { text: "API SLA guarantee", included: false },
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: 299,
    description:
      "For large operations that need unlimited scale and dedicated support.",
    limits: {
      leads: "Unlimited",
      api: "100,000 / mo",
      compliance: "Unlimited",
    },
    features: [
      { text: "Everything in Professional", included: true },
      { text: "Unlimited leads", included: true },
      { text: "Unlimited compliance checks", included: true },
      { text: "Custom integrations", included: true },
      { text: "Dedicated account manager", included: true },
      { text: "White-label options", included: true },
      { text: "API SLA guarantee", included: true },
      { text: "Custom reporting", included: true },
      { text: "SSO / SAML", included: true },
      { text: "On-call engineering support", included: true },
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
];

const faqs = [
  {
    question: "Is there a free trial?",
    answer:
      "Yes. Every plan includes a 14-day free trial with full access to all features in that tier. No credit card required to start.",
  },
  {
    question: "Can I change plans later?",
    answer:
      "Absolutely. You can upgrade or downgrade your plan at any time. When upgrading, you get immediate access to the new tier. Downgrades take effect at the end of your current billing cycle.",
  },
  {
    question: "What happens if I exceed my monthly limits?",
    answer:
      "You will receive a notification at 80% and 100% usage. Once you hit your limit, additional requests will return a rate-limit error. You can upgrade your plan or purchase add-on packs to continue.",
  },
  {
    question: "Do you offer annual billing?",
    answer:
      "Yes. Annual billing is available at a 20% discount. Contact us for annual pricing details.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards through Stripe. Enterprise customers can also pay via ACH bank transfer through our Mercury integration.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. There are no long-term contracts. You can cancel your subscription at any time and your access will continue until the end of your current billing period.",
  },
];

export default function Pricing() {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="pricing-page">
      <style>{`
        .pricing-page {
          background: #0a0a0f;
          min-height: 100vh;
          color: #ffffff;
          overflow-x: hidden;
          font-family: 'Inter', -apple-system, sans-serif;
        }

        /* Header handled by PublicNav component */

        /* HERO */
        .pr-hero {
          padding: 160px 40px 80px;
          text-align: center;
          position: relative;
        }

        .pr-hero::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(ellipse 70% 50% at 50% 0%, rgba(16, 185, 129, 0.08) 0%, transparent 60%);
        }

        .pr-hero-content {
          max-width: 800px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .pr-hero-label {
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

        .pr-hero-title {
          font-size: clamp(2.5rem, 5vw, 4rem);
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 24px;
          letter-spacing: -0.03em;
        }

        .pr-hero-title .highlight {
          background: linear-gradient(135deg, #10b981, #34d399, #6ee7b7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .pr-hero-desc {
          font-size: 1.2rem;
          color: rgba(255,255,255,0.55);
          line-height: 1.8;
          max-width: 640px;
          margin: 0 auto;
        }

        /* COMMON */
        .pr-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 40px;
        }

        /* PRICING CARDS */
        .pr-cards-section {
          padding: 40px 0 120px;
          position: relative;
        }

        .pr-cards-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          align-items: stretch;
        }

        .pr-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 24px;
          padding: 40px 32px;
          display: flex;
          flex-direction: column;
          transition: all 0.4s ease;
          position: relative;
        }

        .pr-card:hover {
          transform: translateY(-4px);
          border-color: rgba(16, 185, 129, 0.15);
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        }

        .pr-card.highlighted {
          border-color: rgba(16, 185, 129, 0.3);
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.06), rgba(16, 185, 129, 0.01));
          box-shadow: 0 0 60px rgba(16, 185, 129, 0.08);
        }

        .pr-card.highlighted:hover {
          border-color: rgba(16, 185, 129, 0.4);
          box-shadow: 0 20px 80px rgba(16, 185, 129, 0.12);
        }

        .pr-recommended {
          position: absolute;
          top: -14px;
          left: 50%;
          transform: translateX(-50%);
          padding: 6px 20px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          border-radius: 100px;
          box-shadow: 0 0 24px rgba(16, 185, 129, 0.4);
          white-space: nowrap;
        }

        .pr-card-name {
          font-size: 1.2rem;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .pr-card-desc {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.45);
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .pr-card-price {
          display: flex;
          align-items: baseline;
          gap: 4px;
          margin-bottom: 8px;
        }

        .pr-card-price-value {
          font-size: 3rem;
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        .pr-card.highlighted .pr-card-price-value {
          background: linear-gradient(135deg, #10b981, #34d399);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .pr-card-price-period {
          font-size: 1rem;
          color: rgba(255,255,255,0.4);
          font-weight: 500;
        }

        .pr-card-billed {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.3);
          margin-bottom: 28px;
        }

        /* LIMITS */
        .pr-limits {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 20px 0;
          margin-bottom: 24px;
          border-top: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .pr-limit-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .pr-limit-label {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.5);
        }

        .pr-limit-value {
          font-size: 0.85rem;
          font-weight: 700;
          color: #fff;
        }

        /* FEATURES */
        .pr-features {
          list-style: none;
          padding: 0;
          margin: 0 0 32px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex-grow: 1;
        }

        .pr-feature {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.9rem;
        }

        .pr-feature.included {
          color: rgba(255,255,255,0.7);
        }

        .pr-feature.excluded {
          color: rgba(255,255,255,0.2);
        }

        .pr-feature svg {
          flex-shrink: 0;
        }

        .pr-feature.included svg {
          color: #10b981;
        }

        .pr-feature.excluded svg {
          color: rgba(255,255,255,0.15);
        }

        /* CTA BUTTON */
        .pr-card-cta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 24px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.95rem;
          text-decoration: none;
          transition: all 0.3s;
          cursor: pointer;
          border: none;
        }

        .pr-card-cta.primary {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.3);
        }

        .pr-card-cta.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 50px rgba(16, 185, 129, 0.5);
        }

        .pr-card-cta.secondary {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
        }

        .pr-card-cta.secondary:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.2);
          transform: translateY(-2px);
        }

        /* COMPARE BAR */
        .pr-compare-bar {
          padding: 80px 0;
          background: #0f1419;
        }

        .pr-compare-inner {
          text-align: center;
        }

        .pr-compare-title {
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgba(255,255,255,0.4);
          margin-bottom: 32px;
        }

        .pr-compare-icons {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 48px;
          flex-wrap: wrap;
        }

        .pr-compare-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .pr-compare-item-icon {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05));
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #10b981;
        }

        .pr-compare-item-label {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.5);
          font-weight: 500;
        }

        /* FAQ */
        .pr-faq-section {
          padding: 100px 0;
          background: #0a0a0f;
        }

        .pr-faq-header {
          text-align: center;
          margin-bottom: 56px;
        }

        .pr-faq-label {
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

        .pr-faq-title {
          font-size: clamp(1.8rem, 3.5vw, 2.5rem);
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .pr-faq-list {
          max-width: 760px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .pr-faq-item {
          background: linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          overflow: hidden;
          transition: border-color 0.3s;
        }

        .pr-faq-item:hover {
          border-color: rgba(255,255,255,0.1);
        }

        .pr-faq-item.open {
          border-color: rgba(16, 185, 129, 0.15);
        }

        .pr-faq-question {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          color: #fff;
          background: none;
          border: none;
          width: 100%;
          text-align: left;
          transition: color 0.2s;
          font-family: inherit;
        }

        .pr-faq-question:hover {
          color: #34d399;
        }

        .pr-faq-question svg {
          flex-shrink: 0;
          color: rgba(255,255,255,0.3);
          transition: color 0.2s;
        }

        .pr-faq-item.open .pr-faq-question svg {
          color: #10b981;
        }

        .pr-faq-answer {
          padding: 0 24px 20px;
          font-size: 0.95rem;
          color: rgba(255,255,255,0.5);
          line-height: 1.7;
        }

        /* CTA */
        .pr-cta-section {
          padding: 120px 0;
          text-align: center;
          position: relative;
          background: #0f1419;
        }

        .pr-cta-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(ellipse 60% 50% at 50% 50%, rgba(16, 185, 129, 0.08) 0%, transparent 60%);
        }

        .pr-cta-content {
          position: relative;
          z-index: 1;
        }

        .pr-cta-title {
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 800;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .pr-cta-desc {
          font-size: 1.1rem;
          color: rgba(255,255,255,0.5);
          margin-bottom: 40px;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }

        .pr-btn-primary {
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

        .pr-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 60px rgba(16, 185, 129, 0.5);
        }

        /* Footer handled by PublicFooter component */

        /* RESPONSIVE */
        @media (max-width: 1024px) {
          .pr-cards-grid {
            grid-template-columns: 1fr;
            max-width: 480px;
            margin: 0 auto;
          }

          .pr-card.highlighted {
            order: -1;
          }
        }

        @media (max-width: 768px) {
          .pr-hero {
            padding: 120px 20px 60px;
          }

          .pr-container {
            padding: 0 20px;
          }

          .pr-compare-icons {
            gap: 24px;
          }
        }
      `}</style>

      <PublicNav />

      {/* HERO */}
      <section className="pr-hero">
        <div className="pr-hero-content">
          <div className="pr-hero-label">
            <Zap size={14} />
            Simple, transparent pricing
          </div>
          <h1 className="pr-hero-title">
            One platform,
            <br />
            <span className="highlight">three plans</span>
          </h1>
          <p className="pr-hero-desc">
            Start free for 14 days. No credit card required. Pick the plan that
            fits your volume and scale as you grow.
          </p>
        </div>
      </section>

      {/* PRICING CARDS */}
      <section className="pr-cards-section">
        <div className="pr-container">
          <div className="pr-cards-grid">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`pr-card ${tier.highlighted ? "highlighted" : ""}`}
              >
                {tier.highlighted && (
                  <div className="pr-recommended">Recommended</div>
                )}

                <div className="pr-card-name">{tier.name}</div>
                <div className="pr-card-desc">{tier.description}</div>

                <div className="pr-card-price">
                  <span className="pr-card-price-value">${tier.price}</span>
                  <span className="pr-card-price-period">/mo</span>
                </div>
                <div className="pr-card-billed">Billed monthly</div>

                <div className="pr-limits">
                  <div className="pr-limit-row">
                    <span className="pr-limit-label">Leads</span>
                    <span className="pr-limit-value">{tier.limits.leads}</span>
                  </div>
                  <div className="pr-limit-row">
                    <span className="pr-limit-label">API Calls</span>
                    <span className="pr-limit-value">{tier.limits.api}</span>
                  </div>
                  <div className="pr-limit-row">
                    <span className="pr-limit-label">Compliance Checks</span>
                    <span className="pr-limit-value">
                      {tier.limits.compliance}
                    </span>
                  </div>
                </div>

                <ul className="pr-features">
                  {tier.features.map((feature) => (
                    <li
                      key={feature.text}
                      className={`pr-feature ${feature.included ? "included" : "excluded"}`}
                    >
                      {feature.included ? <Check size={16} /> : <X size={16} />}
                      <span>{feature.text}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/get-started"
                  className={`pr-card-cta ${tier.highlighted ? "primary" : "secondary"}`}
                >
                  {tier.cta}
                  <ArrowRight size={16} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT'S INCLUDED */}
      <section className="pr-compare-bar">
        <div className="pr-container">
          <div className="pr-compare-inner">
            <div className="pr-compare-title">Every plan includes</div>
            <div className="pr-compare-icons">
              <div className="pr-compare-item">
                <div className="pr-compare-item-icon">
                  <Shield size={24} />
                </div>
                <span className="pr-compare-item-label">Compliance Engine</span>
              </div>
              <div className="pr-compare-item">
                <div className="pr-compare-item-icon">
                  <Code size={24} />
                </div>
                <span className="pr-compare-item-label">REST API Access</span>
              </div>
              <div className="pr-compare-item">
                <div className="pr-compare-item-icon">
                  <Users size={24} />
                </div>
                <span className="pr-compare-item-label">Lead Management</span>
              </div>
              <div className="pr-compare-item">
                <div className="pr-compare-item-icon">
                  <Zap size={24} />
                </div>
                <span className="pr-compare-item-label">
                  Equipment Database
                </span>
              </div>
              <div className="pr-compare-item">
                <div className="pr-compare-item-icon">
                  <Headphones size={24} />
                </div>
                <span className="pr-compare-item-label">Support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="pr-faq-section">
        <div className="pr-container">
          <div className="pr-faq-header">
            <div className="pr-faq-label">
              <Zap size={14} />
              FAQ
            </div>
            <h2 className="pr-faq-title">Frequently asked questions</h2>
          </div>

          <div className="pr-faq-list">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className={`pr-faq-item ${openFaq === index ? "open" : ""}`}
              >
                <button
                  className="pr-faq-question"
                  onClick={() => toggleFaq(index)}
                >
                  <span>{faq.question}</span>
                  {openFaq === index ? (
                    <ChevronUp size={18} />
                  ) : (
                    <ChevronDown size={18} />
                  )}
                </button>
                {openFaq === index && (
                  <div className="pr-faq-answer">{faq.answer}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pr-cta-section">
        <div className="pr-cta-content">
          <h2 className="pr-cta-title">
            Ready to automate your solar business?
          </h2>
          <p className="pr-cta-desc">
            Start your 14-day free trial today. No credit card required.
          </p>
          <Link to="/get-started" className="pr-btn-primary">
            Get Started Free
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
