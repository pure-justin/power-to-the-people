import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Home,
  Mail,
  Phone,
  MapPin,
  Zap,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  User,
  DollarSign,
  Gift,
  Clock,
  Send,
  Loader2,
} from "lucide-react";

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "DC", label: "District of Columbia" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

const API_BASE =
  "https://us-central1-power-to-the-people-vpp.cloudfunctions.net/customerApi";

export default function GetStarted() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const [submitError, setSubmitError] = useState("");

  // Step 1: Address
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");

  // Step 2: Utility
  const [utilityCompany, setUtilityCompany] = useState("");
  const [monthlyBill, setMonthlyBill] = useState("");
  const [avgUsage, setAvgUsage] = useState("");

  // Step 3: Contact
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Step 4: Referral
  const [hasReferral, setHasReferral] = useState(false);
  const [referralCode, setReferralCode] = useState("");

  const totalSteps = 5;

  const stepConfig = [
    { num: 1, label: "Address", icon: MapPin },
    { num: 2, label: "Utility", icon: Zap },
    { num: 3, label: "Contact", icon: User },
    { num: 4, label: "Referral", icon: Gift },
    { num: 5, label: "Confirm", icon: CheckCircle },
  ];

  function canAdvance() {
    switch (step) {
      case 1:
        return (
          street.trim() !== "" &&
          city.trim() !== "" &&
          state !== "" &&
          zip.trim() !== ""
        );
      case 2:
        return utilityCompany.trim() !== "" && monthlyBill !== "";
      case 3:
        return (
          fullName.trim() !== "" && email.trim() !== "" && phone.trim() !== ""
        );
      case 4:
        return true; // Referral is optional
      case 5:
        return true;
      default:
        return false;
    }
  }

  function handleNext() {
    if (step < totalSteps && canAdvance()) {
      setStep(step + 1);
    }
  }

  function handleBack() {
    if (step > 1) {
      setStep(step - 1);
    }
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setSubmitError("");

    const payload = {
      address: {
        street: street.trim(),
        city: city.trim(),
        state,
        zip: zip.trim(),
      },
      utility: {
        company: utilityCompany.trim(),
        monthlyBill: parseFloat(monthlyBill),
        ...(avgUsage ? { avgUsageKwh: parseFloat(avgUsage) } : {}),
      },
      contact: {
        name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      },
      ...(hasReferral && referralCode.trim()
        ? { referralCode: referralCode.trim() }
        : {}),
    };

    try {
      const res = await fetch(`${API_BASE}/customer/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Signup failed. Please try again.");
      }

      setTrackingCode(data.trackingCode || data.tracking_code || "");
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Success state after submission
  if (submitted) {
    return (
      <div className="get-started-page">
        <style>{getStyles()}</style>
        <header className="gs-header">
          <div className="gs-header-inner">
            <Link to="/" className="gs-logo">
              <div className="gs-logo-icon">
                <Zap size={20} />
              </div>
              Power to the People
            </Link>
          </div>
        </header>
        <div className="gs-container">
          <div className="gs-success-card">
            <div className="gs-success-icon">
              <CheckCircle size={64} />
            </div>
            <h1 className="gs-success-title">You're All Set!</h1>
            <p className="gs-success-subtitle">
              Your information has been submitted successfully.
            </p>
            {trackingCode && (
              <div className="gs-tracking-box">
                <p className="gs-tracking-label">Your Tracking Code</p>
                <p className="gs-tracking-code">{trackingCode}</p>
                <p className="gs-tracking-hint">
                  Save this code to check your application status
                </p>
              </div>
            )}
            <div className="gs-next-steps">
              <h3 className="gs-next-title">What happens next?</h3>
              <div className="gs-timeline">
                <div className="gs-timeline-item">
                  <div className="gs-timeline-dot">
                    <Clock size={16} />
                  </div>
                  <div>
                    <p className="gs-timeline-step">Within 24 hours</p>
                    <p className="gs-timeline-desc">
                      We'll review your information and check eligibility
                    </p>
                  </div>
                </div>
                <div className="gs-timeline-item">
                  <div className="gs-timeline-dot">
                    <Phone size={16} />
                  </div>
                  <div>
                    <p className="gs-timeline-step">Specialist Contact</p>
                    <p className="gs-timeline-desc">
                      A solar specialist will reach out to discuss your options
                    </p>
                  </div>
                </div>
                <div className="gs-timeline-item">
                  <div className="gs-timeline-dot">
                    <Home size={16} />
                  </div>
                  <div>
                    <p className="gs-timeline-step">Custom Proposal</p>
                    <p className="gs-timeline-desc">
                      Get a free custom solar proposal tailored for your home
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 32 }} className="gs-success-actions">
              <a
                href={`/signup?email=${encodeURIComponent(email)}&name=${encodeURIComponent(fullName)}`}
                className="gs-btn gs-btn-primary"
                style={{
                  display: "inline-flex",
                  width: "100%",
                  justifyContent: "center",
                }}
              >
                Create Your Account to Track Progress
                <ArrowRight size={18} />
              </a>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "rgba(255,255,255,0.4)",
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                Track your project status, upload documents, and schedule
                appointments
              </p>
              <Link
                to="/"
                className="gs-btn gs-btn-secondary"
                style={{
                  display: "inline-flex",
                  width: "100%",
                  justifyContent: "center",
                  marginTop: 12,
                }}
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="get-started-page">
      <style>{getStyles()}</style>

      {/* Header */}
      <header className="gs-header">
        <div className="gs-header-inner">
          <Link to="/" className="gs-logo">
            <div className="gs-logo-icon">
              <Zap size={20} />
            </div>
            Power to the People
          </Link>
        </div>
      </header>

      <div className="gs-container">
        {/* Progress Indicator */}
        <div className="gs-progress">
          {stepConfig.map((s) => {
            const Icon = s.icon;
            const isActive = step === s.num;
            const isComplete = step > s.num;
            return (
              <div
                key={s.num}
                className={`gs-progress-step ${isActive ? "active" : ""} ${isComplete ? "complete" : ""}`}
              >
                <div className="gs-progress-circle">
                  {isComplete ? <CheckCircle size={20} /> : <Icon size={18} />}
                </div>
                <span className="gs-progress-label">{s.label}</span>
                {s.num < totalSteps && <div className="gs-progress-line" />}
              </div>
            );
          })}
        </div>

        {/* Form Card */}
        <div className="gs-card">
          {/* Step 1: Address */}
          {step === 1 && (
            <div className="gs-step">
              <div className="gs-step-header">
                <MapPin size={28} className="gs-step-icon" />
                <div>
                  <h2 className="gs-step-title">Where is your home?</h2>
                  <p className="gs-step-subtitle">
                    Enter your address so we can evaluate solar potential and
                    local incentives.
                  </p>
                </div>
              </div>
              <div className="gs-fields">
                <div className="gs-field gs-field-full">
                  <label className="gs-label">Street Address</label>
                  <input
                    type="text"
                    className="gs-input"
                    placeholder="123 Main Street"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="gs-field">
                  <label className="gs-label">City</label>
                  <input
                    type="text"
                    className="gs-input"
                    placeholder="Austin"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="gs-field">
                  <label className="gs-label">State</label>
                  <select
                    className="gs-input gs-select"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  >
                    <option value="">Select state...</option>
                    {US_STATES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="gs-field">
                  <label className="gs-label">Zip Code</label>
                  <input
                    type="text"
                    className="gs-input"
                    placeholder="78701"
                    maxLength={10}
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Utility Info */}
          {step === 2 && (
            <div className="gs-step">
              <div className="gs-step-header">
                <Zap size={28} className="gs-step-icon" />
                <div>
                  <h2 className="gs-step-title">Tell us about your energy</h2>
                  <p className="gs-step-subtitle">
                    This helps us estimate your savings and design the right
                    system.
                  </p>
                </div>
              </div>
              <div className="gs-fields">
                <div className="gs-field gs-field-full">
                  <label className="gs-label">Utility Company</label>
                  <input
                    type="text"
                    className="gs-input"
                    placeholder="e.g. Austin Energy, CPS Energy"
                    value={utilityCompany}
                    onChange={(e) => setUtilityCompany(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="gs-field">
                  <label className="gs-label">Monthly Electric Bill ($)</label>
                  <div className="gs-input-wrapper">
                    <DollarSign size={16} className="gs-input-icon" />
                    <input
                      type="number"
                      className="gs-input gs-input-with-icon"
                      placeholder="150"
                      min="0"
                      value={monthlyBill}
                      onChange={(e) => setMonthlyBill(e.target.value)}
                    />
                  </div>
                </div>
                <div className="gs-field">
                  <label className="gs-label">
                    Average Monthly Usage (kWh)
                    <span className="gs-optional">optional</span>
                  </label>
                  <input
                    type="number"
                    className="gs-input"
                    placeholder="1200"
                    min="0"
                    value={avgUsage}
                    onChange={(e) => setAvgUsage(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Contact */}
          {step === 3 && (
            <div className="gs-step">
              <div className="gs-step-header">
                <User size={28} className="gs-step-icon" />
                <div>
                  <h2 className="gs-step-title">How can we reach you?</h2>
                  <p className="gs-step-subtitle">
                    We'll use this to send your custom solar proposal.
                  </p>
                </div>
              </div>
              <div className="gs-fields">
                <div className="gs-field gs-field-full">
                  <label className="gs-label">Full Name</label>
                  <div className="gs-input-wrapper">
                    <User size={16} className="gs-input-icon" />
                    <input
                      type="text"
                      className="gs-input gs-input-with-icon"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="gs-field">
                  <label className="gs-label">Email Address</label>
                  <div className="gs-input-wrapper">
                    <Mail size={16} className="gs-input-icon" />
                    <input
                      type="email"
                      className="gs-input gs-input-with-icon"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="gs-field">
                  <label className="gs-label">Phone Number</label>
                  <div className="gs-input-wrapper">
                    <Phone size={16} className="gs-input-icon" />
                    <input
                      type="tel"
                      className="gs-input gs-input-with-icon"
                      placeholder="(512) 555-0123"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Referral */}
          {step === 4 && (
            <div className="gs-step">
              <div className="gs-step-header">
                <Gift size={28} className="gs-step-icon" />
                <div>
                  <h2 className="gs-step-title">Were you referred?</h2>
                  <p className="gs-step-subtitle">
                    If someone referred you, enter their code below. This step
                    is completely optional.
                  </p>
                </div>
              </div>
              <div className="gs-fields">
                <div className="gs-field gs-field-full">
                  <label className="gs-checkbox-label">
                    <input
                      type="checkbox"
                      className="gs-checkbox"
                      checked={hasReferral}
                      onChange={(e) => {
                        setHasReferral(e.target.checked);
                        if (!e.target.checked) setReferralCode("");
                      }}
                    />
                    <span>Yes, I was referred by someone</span>
                  </label>
                </div>
                {hasReferral && (
                  <div className="gs-field gs-field-full gs-fade-in">
                    <label className="gs-label">Referral Code</label>
                    <input
                      type="text"
                      className="gs-input"
                      placeholder="Enter referral code"
                      value={referralCode}
                      onChange={(e) =>
                        setReferralCode(e.target.value.toUpperCase())
                      }
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Confirmation */}
          {step === 5 && (
            <div className="gs-step">
              <div className="gs-step-header">
                <CheckCircle size={28} className="gs-step-icon" />
                <div>
                  <h2 className="gs-step-title">Review your information</h2>
                  <p className="gs-step-subtitle">
                    Please confirm everything looks correct before submitting.
                  </p>
                </div>
              </div>

              <div className="gs-summary">
                <div className="gs-summary-section">
                  <h4 className="gs-summary-heading">
                    <MapPin size={16} /> Address
                  </h4>
                  <p className="gs-summary-text">
                    {street}
                    <br />
                    {city},{" "}
                    {US_STATES.find((s) => s.value === state)?.label || state}{" "}
                    {zip}
                  </p>
                </div>

                <div className="gs-summary-section">
                  <h4 className="gs-summary-heading">
                    <Zap size={16} /> Utility
                  </h4>
                  <p className="gs-summary-text">
                    {utilityCompany}
                    <br />${monthlyBill}/month
                    {avgUsage ? ` | ${avgUsage} kWh avg` : ""}
                  </p>
                </div>

                <div className="gs-summary-section">
                  <h4 className="gs-summary-heading">
                    <User size={16} /> Contact
                  </h4>
                  <p className="gs-summary-text">
                    {fullName}
                    <br />
                    {email}
                    <br />
                    {phone}
                  </p>
                </div>

                {hasReferral && referralCode && (
                  <div className="gs-summary-section">
                    <h4 className="gs-summary-heading">
                      <Gift size={16} /> Referral
                    </h4>
                    <p className="gs-summary-text">{referralCode}</p>
                  </div>
                )}
              </div>

              <div className="gs-what-next">
                <h4 className="gs-what-next-title">What happens next?</h4>
                <div className="gs-what-next-steps">
                  <div className="gs-what-next-item">
                    <span className="gs-what-next-num">1</span>
                    <p>We'll review your information within 24 hours</p>
                  </div>
                  <div className="gs-what-next-item">
                    <span className="gs-what-next-num">2</span>
                    <p>A solar specialist will reach out to discuss options</p>
                  </div>
                  <div className="gs-what-next-item">
                    <span className="gs-what-next-num">3</span>
                    <p>Get a free custom proposal for your home</p>
                  </div>
                </div>
              </div>

              {submitError && (
                <div className="gs-error">
                  <p>{submitError}</p>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="gs-nav">
            {step > 1 && (
              <button
                type="button"
                className="gs-btn gs-btn-secondary"
                onClick={handleBack}
              >
                <ArrowLeft size={18} />
                Back
              </button>
            )}
            <div className="gs-nav-spacer" />
            {step < totalSteps && (
              <button
                type="button"
                className="gs-btn gs-btn-primary"
                onClick={handleNext}
                disabled={!canAdvance()}
              >
                Next
                <ArrowRight size={18} />
              </button>
            )}
            {step === totalSteps && (
              <button
                type="button"
                className="gs-btn gs-btn-submit"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="gs-spinner" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Submit
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getStyles() {
  return `
    .get-started-page {
      background: #0a0a0f;
      min-height: 100vh;
      color: #ffffff;
    }

    /* Header */
    .gs-header {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(10, 10, 15, 0.95);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255,255,255,0.08);
      padding: 16px 0;
    }

    .gs-header-inner {
      max-width: 800px;
      margin: 0 auto;
      padding: 0 24px;
      display: flex;
      align-items: center;
    }

    .gs-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 800;
      font-size: 1.15rem;
      color: #fff;
      text-decoration: none;
    }

    .gs-logo-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #10b981, #059669);
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
    }

    /* Container */
    .gs-container {
      max-width: 720px;
      margin: 0 auto;
      padding: 40px 24px 80px;
    }

    /* Progress Indicator */
    .gs-progress {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      gap: 0;
      margin-bottom: 48px;
      padding: 0 8px;
    }

    .gs-progress-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      flex: 1;
      max-width: 120px;
    }

    .gs-progress-circle {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.06);
      border: 2px solid rgba(255,255,255,0.15);
      color: rgba(255,255,255,0.4);
      transition: all 0.3s ease;
      position: relative;
      z-index: 2;
    }

    .gs-progress-step.active .gs-progress-circle {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1));
      border-color: #10b981;
      color: #10b981;
      box-shadow: 0 0 24px rgba(16, 185, 129, 0.3);
    }

    .gs-progress-step.complete .gs-progress-circle {
      background: #10b981;
      border-color: #10b981;
      color: #fff;
    }

    .gs-progress-label {
      margin-top: 8px;
      font-size: 0.75rem;
      font-weight: 600;
      color: rgba(255,255,255,0.35);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .gs-progress-step.active .gs-progress-label {
      color: #10b981;
    }

    .gs-progress-step.complete .gs-progress-label {
      color: rgba(16, 185, 129, 0.7);
    }

    .gs-progress-line {
      position: absolute;
      top: 22px;
      left: calc(50% + 26px);
      width: calc(100% - 52px);
      height: 2px;
      background: rgba(255,255,255,0.1);
      z-index: 1;
    }

    .gs-progress-step.complete .gs-progress-line {
      background: rgba(16, 185, 129, 0.5);
    }

    /* Card */
    .gs-card {
      background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 24px;
      padding: 40px;
    }

    /* Step layout */
    .gs-step {
      animation: gs-fade-in 0.3s ease;
    }

    @keyframes gs-fade-in {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .gs-fade-in {
      animation: gs-fade-in 0.25s ease;
    }

    .gs-step-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 32px;
    }

    .gs-step-icon {
      color: #10b981;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .gs-step-title {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 0 6px 0;
    }

    .gs-step-subtitle {
      color: rgba(255,255,255,0.55);
      font-size: 0.95rem;
      margin: 0;
      line-height: 1.5;
    }

    /* Fields */
    .gs-fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .gs-field-full {
      grid-column: 1 / -1;
    }

    .gs-label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: rgba(255,255,255,0.7);
      margin-bottom: 8px;
    }

    .gs-optional {
      color: rgba(255,255,255,0.35);
      font-weight: 400;
      font-size: 0.8rem;
      margin-left: 6px;
    }

    .gs-input {
      width: 100%;
      padding: 14px 16px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 12px;
      color: #fff;
      font-size: 1rem;
      transition: all 0.2s ease;
      outline: none;
      box-sizing: border-box;
    }

    .gs-input::placeholder {
      color: rgba(255,255,255,0.25);
    }

    .gs-input:focus {
      border-color: #10b981;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
      background: rgba(255,255,255,0.08);
    }

    .gs-select {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 14px center;
      padding-right: 40px;
      cursor: pointer;
    }

    .gs-input-wrapper {
      position: relative;
    }

    .gs-input-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: rgba(255,255,255,0.3);
      pointer-events: none;
    }

    .gs-input-with-icon {
      padding-left: 40px;
    }

    /* Checkbox */
    .gs-checkbox-label {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      font-size: 1rem;
      color: rgba(255,255,255,0.8);
      padding: 16px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      transition: all 0.2s ease;
    }

    .gs-checkbox-label:hover {
      background: rgba(255,255,255,0.06);
      border-color: rgba(16, 185, 129, 0.3);
    }

    .gs-checkbox {
      width: 20px;
      height: 20px;
      accent-color: #10b981;
      cursor: pointer;
      flex-shrink: 0;
    }

    /* Summary */
    .gs-summary {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 32px;
    }

    .gs-summary-section {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px;
      padding: 20px;
    }

    .gs-summary-heading {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #10b981;
      margin: 0 0 12px 0;
    }

    .gs-summary-text {
      color: rgba(255,255,255,0.75);
      font-size: 0.95rem;
      line-height: 1.6;
      margin: 0;
    }

    /* What Happens Next */
    .gs-what-next {
      background: rgba(16, 185, 129, 0.06);
      border: 1px solid rgba(16, 185, 129, 0.15);
      border-radius: 14px;
      padding: 24px;
    }

    .gs-what-next-title {
      font-size: 1rem;
      font-weight: 700;
      margin: 0 0 16px 0;
      color: #10b981;
    }

    .gs-what-next-steps {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .gs-what-next-item {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .gs-what-next-num {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .gs-what-next-item p {
      color: rgba(255,255,255,0.7);
      font-size: 0.9rem;
      margin: 0;
    }

    /* Error */
    .gs-error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 12px;
      padding: 14px 18px;
      margin-top: 20px;
    }

    .gs-error p {
      color: #ef4444;
      font-size: 0.9rem;
      margin: 0;
    }

    /* Navigation */
    .gs-nav {
      display: flex;
      align-items: center;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid rgba(255,255,255,0.08);
    }

    .gs-nav-spacer {
      flex: 1;
    }

    /* Buttons */
    .gs-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 14px 28px;
      font-size: 0.95rem;
      font-weight: 600;
      border-radius: 12px;
      border: none;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
    }

    .gs-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .gs-btn-secondary {
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.7);
      border: 1px solid rgba(255,255,255,0.12);
    }

    .gs-btn-secondary:hover:not(:disabled) {
      background: rgba(255,255,255,0.12);
      color: #fff;
    }

    .gs-btn-primary {
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
      box-shadow: 0 0 30px rgba(16, 185, 129, 0.25);
    }

    .gs-btn-primary:hover:not(:disabled) {
      box-shadow: 0 0 50px rgba(16, 185, 129, 0.4);
      transform: translateY(-2px);
    }

    .gs-btn-submit {
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
      box-shadow: 0 0 30px rgba(16, 185, 129, 0.25);
      padding: 14px 36px;
    }

    .gs-btn-submit:hover:not(:disabled) {
      box-shadow: 0 0 50px rgba(16, 185, 129, 0.4);
      transform: translateY(-2px);
    }

    /* Spinner */
    .gs-spinner {
      animation: gs-spin 1s linear infinite;
    }

    @keyframes gs-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Success Card */
    .gs-success-card {
      text-align: center;
      padding: 60px 40px;
      max-width: 560px;
      margin: 0 auto;
    }

    .gs-success-icon {
      color: #10b981;
      margin-bottom: 24px;
    }

    .gs-success-title {
      font-size: 2rem;
      font-weight: 800;
      margin: 0 0 12px 0;
    }

    .gs-success-subtitle {
      color: rgba(255,255,255,0.6);
      font-size: 1.1rem;
      margin: 0 0 32px 0;
    }

    .gs-tracking-box {
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 40px;
    }

    .gs-tracking-label {
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: rgba(255,255,255,0.5);
      margin: 0 0 8px 0;
    }

    .gs-tracking-code {
      font-size: 2.2rem;
      font-weight: 800;
      letter-spacing: 4px;
      color: #10b981;
      margin: 0 0 8px 0;
      font-family: monospace;
    }

    .gs-tracking-hint {
      color: rgba(255,255,255,0.4);
      font-size: 0.85rem;
      margin: 0;
    }

    .gs-next-steps {
      text-align: left;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      padding: 28px;
    }

    .gs-next-title {
      font-size: 1.1rem;
      font-weight: 700;
      margin: 0 0 20px 0;
    }

    .gs-timeline {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .gs-timeline-item {
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }

    .gs-timeline-dot {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .gs-timeline-step {
      font-weight: 600;
      font-size: 0.9rem;
      margin: 0 0 2px 0;
    }

    .gs-timeline-desc {
      color: rgba(255,255,255,0.55);
      font-size: 0.85rem;
      margin: 0;
    }

    /* Responsive */
    @media (max-width: 640px) {
      .gs-container {
        padding: 24px 16px 60px;
      }

      .gs-card {
        padding: 28px 20px;
        border-radius: 18px;
      }

      .gs-fields {
        grid-template-columns: 1fr;
      }

      .gs-summary {
        grid-template-columns: 1fr;
      }

      .gs-progress-label {
        font-size: 0.65rem;
      }

      .gs-progress-circle {
        width: 36px;
        height: 36px;
      }

      .gs-progress-line {
        top: 18px;
        left: calc(50% + 22px);
        width: calc(100% - 44px);
      }

      .gs-step-header {
        flex-direction: column;
        gap: 12px;
      }

      .gs-step-title {
        font-size: 1.25rem;
      }

      .gs-success-card {
        padding: 40px 20px;
      }

      .gs-tracking-code {
        font-size: 1.6rem;
        letter-spacing: 3px;
      }

      .gs-next-steps {
        padding: 20px;
      }
    }
  `;
}
