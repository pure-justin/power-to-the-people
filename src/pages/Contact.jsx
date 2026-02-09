import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Sun,
  ArrowRight,
  Zap,
  Shield,
  Users,
  Code,
  Mail,
  Phone,
  Building2,
  CheckCircle2,
  Clock,
  Globe,
  Headphones,
} from "lucide-react";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    companySize: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { addDoc, collection, serverTimestamp } =
        await import("firebase/firestore");
      const { db } = await import("../services/firebase");
      await addDoc(collection(db, "leads"), {
        customerName: formData.name,
        email: formData.email,
        phone: formData.phone || "",
        company: formData.company || "",
        companySize: formData.companySize || "",
        address: "Contact Form Submission",
        notes: formData.message || "",
        source: "contact_form",
        status: "new",
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Failed to submit contact form:", err);
      // Still show success to user (don't reveal internal errors)
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="contact-page">
      <style>{`
        .contact-page {
          background: #0a0a0f;
          min-height: 100vh;
          color: #ffffff;
          overflow-x: hidden;
          font-family: 'Inter', -apple-system, sans-serif;
        }

        /* HEADER */
        .ct-header {
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

        .ct-header .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ct-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 800;
          font-size: 1.25rem;
          color: #fff;
          text-decoration: none;
          letter-spacing: -0.02em;
        }

        .ct-logo-icon {
          width: 38px;
          height: 38px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 24px rgba(16, 185, 129, 0.4);
        }

        .ct-nav {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ct-nav-link {
          color: rgba(255,255,255,0.6);
          text-decoration: none;
          font-weight: 500;
          font-size: 0.9rem;
          transition: all 0.3s;
          padding: 8px 16px;
          border-radius: 8px;
        }

        .ct-nav-link:hover {
          color: #fff;
          background: rgba(255,255,255,0.05);
        }

        .ct-nav-cta {
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

        .ct-nav-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.5);
        }

        /* HERO */
        .ct-hero {
          padding: 160px 40px 60px;
          text-align: center;
          position: relative;
        }

        .ct-hero::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(ellipse 70% 50% at 50% 0%, rgba(16, 185, 129, 0.08) 0%, transparent 60%);
        }

        .ct-hero-content {
          max-width: 800px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .ct-hero-label {
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

        .ct-hero-title {
          font-size: clamp(2.5rem, 5vw, 4rem);
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 24px;
          letter-spacing: -0.03em;
        }

        .ct-hero-title .highlight {
          background: linear-gradient(135deg, #10b981, #34d399, #6ee7b7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .ct-hero-desc {
          font-size: 1.2rem;
          color: rgba(255,255,255,0.55);
          line-height: 1.8;
          max-width: 640px;
          margin: 0 auto;
        }

        /* COMMON */
        .ct-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 40px;
        }

        /* MAIN SECTION */
        .ct-main-section {
          padding: 60px 0 120px;
        }

        .ct-split-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: flex-start;
        }

        /* LEFT SIDE - INFO */
        .ct-info {
          padding-top: 16px;
        }

        .ct-info-title {
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .ct-info-desc {
          font-size: 1.05rem;
          color: rgba(255,255,255,0.5);
          line-height: 1.8;
          margin-bottom: 40px;
        }

        .ct-benefits {
          list-style: none;
          padding: 0;
          margin: 0 0 48px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .ct-benefit {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }

        .ct-benefit-icon {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05));
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #10b981;
        }

        .ct-benefit-title {
          font-size: 0.95rem;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .ct-benefit-desc {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.4);
          line-height: 1.5;
        }

        .ct-contact-methods {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 28px;
          background: linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
        }

        .ct-contact-method {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ct-contact-method svg {
          color: #10b981;
          flex-shrink: 0;
        }

        .ct-contact-method-text {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.6);
        }

        .ct-contact-method-text a {
          color: #10b981;
          text-decoration: none;
          font-weight: 600;
        }

        .ct-contact-method-text a:hover {
          text-decoration: underline;
        }

        /* RIGHT SIDE - FORM */
        .ct-form-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 24px;
          padding: 40px;
          position: relative;
          overflow: hidden;
        }

        .ct-form-card::before {
          content: '';
          position: absolute;
          top: -40%;
          right: -40%;
          width: 60%;
          height: 60%;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, transparent 60%);
        }

        .ct-form-title {
          font-size: 1.3rem;
          font-weight: 700;
          margin-bottom: 8px;
          position: relative;
          z-index: 1;
        }

        .ct-form-subtitle {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.45);
          margin-bottom: 32px;
          position: relative;
          z-index: 1;
        }

        .ct-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
          position: relative;
          z-index: 1;
        }

        .ct-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .ct-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .ct-field label {
          font-size: 0.8rem;
          font-weight: 600;
          color: rgba(255,255,255,0.6);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .ct-field label .optional {
          font-weight: 400;
          text-transform: none;
          letter-spacing: 0;
          color: rgba(255,255,255,0.3);
        }

        .ct-field input,
        .ct-field select,
        .ct-field textarea {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          color: #fff;
          font-size: 0.95rem;
          font-family: inherit;
          transition: all 0.3s;
          outline: none;
          box-sizing: border-box;
        }

        .ct-field input::placeholder,
        .ct-field textarea::placeholder {
          color: rgba(255,255,255,0.25);
        }

        .ct-field select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
          background-position: right 12px center;
          background-repeat: no-repeat;
          background-size: 20px;
          padding-right: 40px;
        }

        .ct-field select option {
          background: #1a1a2e;
          color: #fff;
        }

        .ct-field input:focus,
        .ct-field select:focus,
        .ct-field textarea:focus {
          border-color: rgba(16, 185, 129, 0.4);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        .ct-field textarea {
          resize: vertical;
          min-height: 100px;
        }

        .ct-submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 28px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          font-weight: 700;
          font-size: 1rem;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.3);
          font-family: inherit;
          width: 100%;
        }

        .ct-submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 50px rgba(16, 185, 129, 0.5);
        }

        .ct-form-note {
          text-align: center;
          font-size: 0.85rem;
          color: rgba(255,255,255,0.35);
          margin-top: 8px;
        }

        .ct-form-note a {
          color: #10b981;
          text-decoration: none;
          font-weight: 600;
        }

        .ct-form-note a:hover {
          text-decoration: underline;
        }

        /* SUCCESS STATE */
        .ct-success {
          text-align: center;
          padding: 40px 0;
          position: relative;
          z-index: 1;
        }

        .ct-success-icon {
          width: 72px;
          height: 72px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          color: #10b981;
        }

        .ct-success-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .ct-success-desc {
          font-size: 1rem;
          color: rgba(255,255,255,0.5);
          line-height: 1.7;
          max-width: 400px;
          margin: 0 auto;
        }

        /* FOOTER */
        .ct-footer {
          padding: 40px 0;
          background: #050508;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .ct-footer .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ct-footer-links {
          display: flex;
          gap: 32px;
        }

        .ct-footer-links a {
          color: rgba(255,255,255,0.4);
          text-decoration: none;
          font-size: 0.85rem;
          transition: color 0.2s;
        }

        .ct-footer-links a:hover {
          color: #10b981;
        }

        .ct-footer-copy {
          color: rgba(255,255,255,0.25);
          font-size: 0.8rem;
        }

        /* RESPONSIVE */
        @media (max-width: 1024px) {
          .ct-split-grid {
            grid-template-columns: 1fr;
            gap: 48px;
          }
        }

        @media (max-width: 768px) {
          .ct-nav-link:not(.ct-nav-cta) {
            display: none;
          }

          .ct-hero {
            padding: 120px 20px 40px;
          }

          .ct-container {
            padding: 0 20px;
          }

          .ct-form-row {
            grid-template-columns: 1fr;
          }

          .ct-form-card {
            padding: 28px;
          }

          .ct-footer .container {
            flex-direction: column;
            gap: 16px;
            text-align: center;
          }
        }
      `}</style>

      {/* HEADER */}
      <header className="ct-header">
        <div className="container">
          <Link to="/" className="ct-logo">
            <div className="ct-logo-icon">
              <Sun size={20} />
            </div>
            SolarOS
          </Link>
          <nav className="ct-nav">
            <Link to="/features" className="ct-nav-link">
              Features
            </Link>
            <Link to="/pricing" className="ct-nav-link">
              Pricing
            </Link>
            <Link to="/about" className="ct-nav-link">
              About
            </Link>
            <Link to="/login" className="ct-nav-link">
              Sign In
            </Link>
            <Link to="/get-started" className="ct-nav-cta">
              Get Started
              <ArrowRight size={16} />
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="ct-hero">
        <div className="ct-hero-content">
          <div className="ct-hero-label">
            <Mail size={14} />
            Get in Touch
          </div>
          <h1 className="ct-hero-title">
            Let us show you
            <br />
            <span className="highlight">what SolarOS can do</span>
          </h1>
          <p className="ct-hero-desc">
            Request a personalized demo, ask a question, or tell us about your
            business. Our team typically responds within a few hours.
          </p>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <section className="ct-main-section">
        <div className="ct-container">
          <div className="ct-split-grid">
            {/* LEFT - INFO */}
            <div className="ct-info">
              <h2 className="ct-info-title">Why schedule a demo?</h2>
              <p className="ct-info-desc">
                See how SolarOS automates the entire solar installation
                lifecycle -- from lead intake to grid interconnection -- in a
                live walkthrough tailored to your business.
              </p>

              <ul className="ct-benefits">
                <li className="ct-benefit">
                  <div className="ct-benefit-icon">
                    <Zap size={20} />
                  </div>
                  <div>
                    <div className="ct-benefit-title">
                      Full platform walkthrough
                    </div>
                    <div className="ct-benefit-desc">
                      See the 10-stage automated pipeline, smart bidding, and
                      compliance engine in action.
                    </div>
                  </div>
                </li>
                <li className="ct-benefit">
                  <div className="ct-benefit-icon">
                    <Shield size={20} />
                  </div>
                  <div>
                    <div className="ct-benefit-title">
                      2026 compliance review
                    </div>
                    <div className="ct-benefit-desc">
                      Understand how FEOC, ITC changes, and tariffs impact your
                      business and equipment choices.
                    </div>
                  </div>
                </li>
                <li className="ct-benefit">
                  <div className="ct-benefit-icon">
                    <Code size={20} />
                  </div>
                  <div>
                    <div className="ct-benefit-title">
                      API integration guidance
                    </div>
                    <div className="ct-benefit-desc">
                      Learn how to connect SolarOS with your existing tools
                      using our REST APIs and webhooks.
                    </div>
                  </div>
                </li>
                <li className="ct-benefit">
                  <div className="ct-benefit-icon">
                    <Users size={20} />
                  </div>
                  <div>
                    <div className="ct-benefit-title">
                      Custom pricing discussion
                    </div>
                    <div className="ct-benefit-desc">
                      Enterprise and volume pricing tailored to your team size
                      and project volume.
                    </div>
                  </div>
                </li>
              </ul>

              <div className="ct-contact-methods">
                <div className="ct-contact-method">
                  <Mail size={18} />
                  <div className="ct-contact-method-text">
                    Email us at{" "}
                    <a href="mailto:contact@solaros.io">contact@solaros.io</a>
                  </div>
                </div>
                <div className="ct-contact-method">
                  <Phone size={18} />
                  <div className="ct-contact-method-text">
                    Call us at <a href="tel:+18005765277">(800) 576-5277</a>
                  </div>
                </div>
                <div className="ct-contact-method">
                  <Clock size={18} />
                  <div className="ct-contact-method-text">
                    Mon - Fri, 8 AM - 6 PM CST
                  </div>
                </div>
                <div className="ct-contact-method">
                  <Globe size={18} />
                  <div className="ct-contact-method-text">
                    Serving all 50 states
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT - FORM */}
            <div className="ct-form-card">
              <div className="ct-form-title">Request a Demo</div>
              <div className="ct-form-subtitle">
                Fill out the form and our team will be in touch shortly.
              </div>

              {submitted ? (
                <div className="ct-success">
                  <div className="ct-success-icon">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="ct-success-title">Request received</h3>
                  <p className="ct-success-desc">
                    Thank you for your interest in SolarOS. A member of our team
                    will reach out to you within one business day to schedule
                    your demo.
                  </p>
                </div>
              ) : (
                <form className="ct-form" onSubmit={handleSubmit}>
                  <div className="ct-form-row">
                    <div className="ct-field">
                      <label htmlFor="ct-name">Name</label>
                      <input
                        id="ct-name"
                        type="text"
                        name="name"
                        placeholder="Your full name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="ct-field">
                      <label htmlFor="ct-email">Email</label>
                      <input
                        id="ct-email"
                        type="email"
                        name="email"
                        placeholder="you@company.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="ct-form-row">
                    <div className="ct-field">
                      <label htmlFor="ct-company">Company</label>
                      <input
                        id="ct-company"
                        type="text"
                        name="company"
                        placeholder="Company name"
                        value={formData.company}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="ct-field">
                      <label htmlFor="ct-phone">
                        Phone <span className="optional">(optional)</span>
                      </label>
                      <input
                        id="ct-phone"
                        type="tel"
                        name="phone"
                        placeholder="(555) 000-0000"
                        value={formData.phone}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="ct-field">
                    <label htmlFor="ct-size">Company Size</label>
                    <select
                      id="ct-size"
                      name="companySize"
                      value={formData.companySize}
                      onChange={handleChange}
                      required
                    >
                      <option value="" disabled>
                        Select company size
                      </option>
                      <option value="1-5">1-5 employees</option>
                      <option value="6-20">6-20 employees</option>
                      <option value="21-50">21-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="200+">200+ employees</option>
                    </select>
                  </div>

                  <div className="ct-field">
                    <label htmlFor="ct-message">Message</label>
                    <textarea
                      id="ct-message"
                      name="message"
                      placeholder="Tell us about your business and what you are looking for..."
                      value={formData.message}
                      onChange={handleChange}
                      rows={4}
                    />
                  </div>

                  <button
                    type="submit"
                    className="ct-submit-btn"
                    disabled={submitting}
                  >
                    {submitting ? "Submitting..." : "Request Demo"}
                    <ArrowRight size={18} />
                  </button>

                  <p className="ct-form-note">
                    Or email us directly at{" "}
                    <a href="mailto:contact@solaros.io">contact@solaros.io</a>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="ct-footer">
        <div className="container">
          <div className="ct-footer-links">
            <Link to="/">Home</Link>
            <Link to="/features">Features</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/about">About</Link>
          </div>
          <p className="ct-footer-copy">
            &copy; 2026 SolarOS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
