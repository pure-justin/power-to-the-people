import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import SolarSavingsCalculator from "../components/SolarSavingsCalculator";

function SavingsCalculator() {
  return (
    <div className="page" style={{ background: "var(--gray-50)" }}>
      {/* Nav */}
      <nav
        style={{
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "var(--gray-600)",
            textDecoration: "none",
            fontSize: "0.9rem",
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={16} />
          Home
        </Link>
      </nav>

      {/* Calculator */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "20px 16px 60px",
        }}
      >
        <SolarSavingsCalculator />
      </div>
    </div>
  );
}

export default SavingsCalculator;
