/**
 * Lead Quality Scoring Engine
 *
 * Scores leads 0-100 based on multiple quality signals:
 * - Contact completeness (name, email, phone)
 * - Property qualification (homeowner, credit score)
 * - Energy data quality (bill data source, usage info)
 * - System design (solar potential, savings)
 * - Engagement signals (source, energy community, referral)
 */

const SCORING_WEIGHTS = {
  contact: 20,
  qualification: 20,
  energyData: 25,
  systemDesign: 20,
  engagement: 15,
};

/**
 * Score a single lead and return detailed breakdown
 */
export function scoreLead(lead) {
  const raw = lead._raw || lead;

  const contact = scoreContact(raw);
  const qualification = scoreQualification(raw);
  const energyData = scoreEnergyData(raw);
  const systemDesign = scoreSystemDesign(raw);
  const engagement = scoreEngagement(raw);

  const totalScore = Math.round(
    contact.score * (SCORING_WEIGHTS.contact / 100) +
      qualification.score * (SCORING_WEIGHTS.qualification / 100) +
      energyData.score * (SCORING_WEIGHTS.energyData / 100) +
      systemDesign.score * (SCORING_WEIGHTS.systemDesign / 100) +
      engagement.score * (SCORING_WEIGHTS.engagement / 100),
  );

  const tier = getTier(totalScore);

  return {
    totalScore,
    tier,
    breakdown: {
      contact: { ...contact, weight: SCORING_WEIGHTS.contact },
      qualification: {
        ...qualification,
        weight: SCORING_WEIGHTS.qualification,
      },
      energyData: { ...energyData, weight: SCORING_WEIGHTS.energyData },
      systemDesign: { ...systemDesign, weight: SCORING_WEIGHTS.systemDesign },
      engagement: { ...engagement, weight: SCORING_WEIGHTS.engagement },
    },
  };
}

function scoreContact(data) {
  let score = 0;
  const signals = [];

  const name =
    data.name ||
    data.customerName ||
    (data.customer &&
      `${data.customer.firstName} ${data.customer.lastName}`.trim());
  const email = data.email || data.customer?.email;
  const phone = data.phone || data.customer?.phone || data.contactInfo?.phone;

  if (name && name !== "Unknown" && name.trim().length > 1) {
    score += 35;
    signals.push("Name provided");
  }
  if (email && email.includes("@")) {
    score += 40;
    signals.push("Valid email");
  }
  if (phone && phone.replace(/\D/g, "").length >= 10) {
    score += 25;
    signals.push("Phone number");
  }

  return { score: Math.min(score, 100), signals };
}

function scoreQualification(data) {
  let score = 0;
  const signals = [];

  const qual = data.qualification || {};
  const creditScore = qual.creditScore || data.creditScore;

  if (qual.isHomeowner) {
    score += 40;
    signals.push("Homeowner");
  }

  if (creditScore) {
    const creditScores = { excellent: 35, good: 25, fair: 15, poor: 5 };
    score += creditScores[creditScore] || 10;
    signals.push(`Credit: ${creditScore}`);
  }

  if (qual.hasUtilityBill || qual.utilityBillUrl) {
    score += 25;
    signals.push("Bill uploaded");
  }

  return { score: Math.min(score, 100), signals };
}

function scoreEnergyData(data) {
  let score = 0;
  const signals = [];

  const bill = data.billData || {};

  if (bill.source === "smart_meter_texas") {
    score += 40;
    signals.push("Smart Meter TX data");
  } else if (bill.source === "utility_bill") {
    score += 30;
    signals.push("Utility bill scanned");
  } else if (bill.source === "estimated") {
    score += 15;
    signals.push("Estimated usage");
  }

  if (bill.monthlyUsageKwh > 0) {
    score += 20;
    signals.push(`${Math.round(bill.monthlyUsageKwh)} kWh/mo`);
  }

  if (bill.annualUsageKwh > 0) {
    score += 10;
    signals.push("Annual data");
  }

  if (bill.historicalData && bill.historicalData.length > 0) {
    score += 15;
    signals.push(`${bill.historicalData.length}mo history`);
  }

  if (bill.provider) {
    score += 10;
    signals.push(bill.provider);
  }

  if (bill.esiid) {
    score += 5;
    signals.push("ESIID linked");
  }

  return { score: Math.min(score, 100), signals };
}

function scoreSystemDesign(data) {
  let score = 0;
  const signals = [];

  const design = data.systemDesign || {};

  if (design.recommendedPanelCount > 0 || design.maxPanelCapacity > 0) {
    score += 25;
    signals.push(
      `${design.recommendedPanelCount || design.maxPanelCapacity} panels`,
    );
  }

  if (design.systemSizeKw > 0) {
    score += 20;
    signals.push(`${design.systemSizeKw} kW`);
  }

  if (design.annualProductionKwh > 0) {
    score += 15;
    signals.push("Production estimated");
  }

  if (design.estimatedCost > 0) {
    score += 15;
    signals.push(`$${(design.estimatedCost / 1000).toFixed(0)}k cost`);
  }

  if (design.estimatedAnnualSavings > 0) {
    score += 15;
    signals.push(`$${Math.round(design.estimatedAnnualSavings)}/yr savings`);
  }

  if (design.paybackPeriodYears > 0 && design.paybackPeriodYears < 25) {
    score += 10;
    signals.push(`${design.paybackPeriodYears.toFixed(1)}yr payback`);
  }

  return { score: Math.min(score, 100), signals };
}

function scoreEngagement(data) {
  let score = 0;
  const signals = [];

  const tracking = data.tracking || {};
  const ec = data.energyCommunity || {};

  if (tracking.source === "referral") {
    score += 35;
    signals.push("Referral lead");
  } else if (tracking.source === "organic") {
    score += 25;
    signals.push("Organic search");
  } else if (tracking.source === "paid") {
    score += 20;
    signals.push("Paid campaign");
  } else if (tracking.source === "direct") {
    score += 15;
    signals.push("Direct visit");
  }

  if (ec.eligible) {
    score += 30;
    signals.push("Energy community");
  }

  if (tracking.referralCode) {
    score += 15;
    signals.push("Has referral code");
  }

  if (tracking.campaign) {
    score += 10;
    signals.push(tracking.campaign);
  }

  const smt = data.smartMeterTexas || {};
  if (smt.linked) {
    score += 10;
    signals.push("SMT linked");
  }

  return { score: Math.min(score, 100), signals };
}

function getTier(score) {
  if (score >= 80) return { label: "Hot", color: "#ef4444", bg: "#fef2f2" };
  if (score >= 60) return { label: "Warm", color: "#f59e0b", bg: "#fffbeb" };
  if (score >= 40) return { label: "Cool", color: "#3b82f6", bg: "#eff6ff" };
  return { label: "Cold", color: "#6b7280", bg: "#f9fafb" };
}

/**
 * Score all leads and return aggregate analytics
 */
export function scoreAllLeads(leads) {
  const scored = leads.map((lead) => ({
    ...lead,
    scoring: scoreLead(lead),
  }));

  // Distribution by tier
  const distribution = { Hot: 0, Warm: 0, Cool: 0, Cold: 0 };
  scored.forEach((l) => {
    distribution[l.scoring.tier.label]++;
  });

  // Score histogram (buckets of 10)
  const histogram = Array.from({ length: 10 }, (_, i) => ({
    range: `${i * 10}-${i * 10 + 9}`,
    min: i * 10,
    max: i * 10 + 9,
    count: 0,
  }));
  scored.forEach((l) => {
    const bucket = Math.min(Math.floor(l.scoring.totalScore / 10), 9);
    histogram[bucket].count++;
  });

  // Average category scores
  const categoryTotals = {
    contact: 0,
    qualification: 0,
    energyData: 0,
    systemDesign: 0,
    engagement: 0,
  };
  scored.forEach((l) => {
    Object.keys(categoryTotals).forEach((cat) => {
      categoryTotals[cat] += l.scoring.breakdown[cat].score;
    });
  });
  const categoryAverages = {};
  Object.keys(categoryTotals).forEach((cat) => {
    categoryAverages[cat] =
      scored.length > 0 ? Math.round(categoryTotals[cat] / scored.length) : 0;
  });

  // Average total score
  const avgScore =
    scored.length > 0
      ? Math.round(
          scored.reduce((sum, l) => sum + l.scoring.totalScore, 0) /
            scored.length,
        )
      : 0;

  // Top leads
  const topLeads = [...scored]
    .sort((a, b) => b.scoring.totalScore - a.scoring.totalScore)
    .slice(0, 5);

  // Bottom leads (improvement opportunities)
  const bottomLeads = [...scored]
    .sort((a, b) => a.scoring.totalScore - b.scoring.totalScore)
    .slice(0, 5);

  return {
    scored,
    distribution,
    histogram,
    categoryAverages,
    avgScore,
    topLeads,
    bottomLeads,
    total: scored.length,
  };
}

export const TIER_CONFIG = {
  Hot: {
    color: "#ef4444",
    bg: "#fef2f2",
    icon: "🔥",
    description: "Ready to close",
  },
  Warm: {
    color: "#f59e0b",
    bg: "#fffbeb",
    icon: "☀️",
    description: "Nurture with follow-up",
  },
  Cool: {
    color: "#3b82f6",
    bg: "#eff6ff",
    icon: "❄️",
    description: "Needs more engagement",
  },
  Cold: {
    color: "#6b7280",
    bg: "#f9fafb",
    icon: "🧊",
    description: "Low priority",
  },
};

export const CATEGORY_LABELS = {
  contact: "Contact Info",
  qualification: "Qualification",
  energyData: "Energy Data",
  systemDesign: "System Design",
  engagement: "Engagement",
};
