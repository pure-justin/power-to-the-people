/**
 * Installer Service
 * Manages installer data, ratings, and comparison logic
 */

// Mock installer database (in production, this would come from Firestore)
const MOCK_INSTALLERS = [
  {
    id: "momentum-solar",
    name: "Momentum Solar",
    logo: "/logos/momentum-solar.png",
    rating: 4.7,
    reviews: 1250,
    yearsInBusiness: 15,
    installsCompleted: 35000,
    warranty: {
      workmanship: 25,
      panels: 25,
      inverters: 12,
      batteries: 15,
    },
    pricePerWatt: 2.45,
    financing: {
      available: true,
      options: ["Cash", "Loan", "PPA", "Lease"],
      minCreditScore: 650,
      apr: 3.99,
    },
    certifications: ["NABCEP", "BBB A+", "Tesla Certified", "Duracell Partner"],
    serviceAreas: ["Texas", "California", "New York", "Florida"],
    responseTime: "2-4 hours",
    installationTime: "4-6 weeks",
    equipmentBrands: {
      panels: ["Q-Cells", "LONGi", "Trina Solar"],
      inverters: ["Enphase", "SolarEdge", "Tesla"],
      batteries: ["Tesla Powerwall", "Duracell Power Center"],
    },
    specialties: ["Residential", "Commercial", "Battery Storage"],
    customerSatisfaction: 94,
    onTimeCompletion: 96,
    permittingSuccess: 98,
    pros: [
      "Fast response time",
      "Extensive experience",
      "Multiple financing options",
      "Strong warranty coverage",
    ],
    cons: ["Higher price point", "Limited equipment variety"],
    contactInfo: {
      phone: "1-800-MOMENTUM",
      email: "sales@momentumsolar.com",
      website: "https://momentumsolar.com",
    },
  },
  {
    id: "sunpower",
    name: "SunPower",
    logo: "/logos/sunpower.png",
    rating: 4.8,
    reviews: 2100,
    yearsInBusiness: 38,
    installsCompleted: 180000,
    warranty: {
      workmanship: 25,
      panels: 40,
      inverters: 25,
      batteries: 10,
    },
    pricePerWatt: 2.95,
    financing: {
      available: true,
      options: ["Cash", "Loan", "PPA", "Lease"],
      minCreditScore: 680,
      apr: 3.49,
    },
    certifications: [
      "NABCEP",
      "BBB A+",
      "Maxeon Partner",
      "EnergySage Screened",
    ],
    serviceAreas: ["All 50 States"],
    responseTime: "1-3 hours",
    installationTime: "5-7 weeks",
    equipmentBrands: {
      panels: ["SunPower Maxeon", "SunPower Performance"],
      inverters: ["Enphase", "SolarEdge"],
      batteries: ["SunVault", "Tesla Powerwall"],
    },
    specialties: [
      "Premium Panels",
      "High Efficiency",
      "Smart Home Integration",
    ],
    customerSatisfaction: 96,
    onTimeCompletion: 94,
    permittingSuccess: 99,
    pros: [
      "Industry-leading panels",
      "40-year panel warranty",
      "Highest efficiency ratings",
      "Excellent customer service",
    ],
    cons: ["Premium pricing", "Longer wait times"],
    contactInfo: {
      phone: "1-800-SUNPOWER",
      email: "info@sunpower.com",
      website: "https://us.sunpower.com",
    },
  },
  {
    id: "tesla-energy",
    name: "Tesla Energy",
    logo: "/logos/tesla.png",
    rating: 4.5,
    reviews: 3400,
    yearsInBusiness: 9,
    installsCompleted: 400000,
    warranty: {
      workmanship: 10,
      panels: 25,
      inverters: 12.5,
      batteries: 10,
    },
    pricePerWatt: 2.2,
    financing: {
      available: true,
      options: ["Cash", "Loan"],
      minCreditScore: 700,
      apr: 4.49,
    },
    certifications: [
      "NABCEP",
      "Tesla Certified Installer",
      "EnergySage Screened",
    ],
    serviceAreas: ["Most Major Markets"],
    responseTime: "4-8 hours",
    installationTime: "6-8 weeks",
    equipmentBrands: {
      panels: ["Tesla Solar Panels"],
      inverters: ["Tesla Solar Inverter"],
      batteries: ["Tesla Powerwall"],
    },
    specialties: ["Integrated Systems", "Battery Storage", "Smart Grid"],
    customerSatisfaction: 89,
    onTimeCompletion: 87,
    permittingSuccess: 96,
    pros: [
      "Competitive pricing",
      "Seamless Tesla ecosystem",
      "Advanced app control",
      "Powerwall integration",
    ],
    cons: [
      "Limited equipment options",
      "Longer installation times",
      "Variable service quality",
    ],
    contactInfo: {
      phone: "1-888-765-2489",
      email: "solarinfo@tesla.com",
      website: "https://tesla.com/energy",
    },
  },
  {
    id: "palmetto-solar",
    name: "Palmetto Solar",
    logo: "/logos/palmetto.png",
    rating: 4.6,
    reviews: 980,
    yearsInBusiness: 14,
    installsCompleted: 28000,
    warranty: {
      workmanship: 25,
      panels: 25,
      inverters: 25,
      batteries: 10,
    },
    pricePerWatt: 2.55,
    financing: {
      available: true,
      options: ["Cash", "Loan", "PPA", "Lease"],
      minCreditScore: 640,
      apr: 4.25,
    },
    certifications: [
      "NABCEP",
      "BBB A+",
      "B Corp Certified",
      "EnergySage Screened",
    ],
    serviceAreas: ["Southeast US", "Texas", "California"],
    responseTime: "2-4 hours",
    installationTime: "4-5 weeks",
    equipmentBrands: {
      panels: ["Q-Cells", "REC Solar", "Silfab"],
      inverters: ["Enphase", "SolarEdge"],
      batteries: ["Enphase Ensemble", "Tesla Powerwall"],
    },
    specialties: [
      "Design-First Approach",
      "Energy Management",
      "Customer Education",
    ],
    customerSatisfaction: 93,
    onTimeCompletion: 95,
    permittingSuccess: 97,
    pros: [
      "Quick installation",
      "Good financing options",
      "Strong customer education",
      "Flexible equipment choices",
    ],
    cons: ["Limited service area", "Mid-range pricing"],
    contactInfo: {
      phone: "1-855-452-7652",
      email: "hello@palmetto.com",
      website: "https://palmetto.com",
    },
  },
  {
    id: "sunrun",
    name: "Sunrun",
    logo: "/logos/sunrun.png",
    rating: 4.3,
    reviews: 4200,
    yearsInBusiness: 17,
    installsCompleted: 750000,
    warranty: {
      workmanship: 10,
      panels: 25,
      inverters: 10,
      batteries: 10,
    },
    pricePerWatt: 2.65,
    financing: {
      available: true,
      options: ["Cash", "Loan", "PPA", "Lease"],
      minCreditScore: 600,
      apr: 4.99,
    },
    certifications: ["NABCEP", "BBB A", "EnergySage Screened"],
    serviceAreas: ["22 States + DC"],
    responseTime: "6-12 hours",
    installationTime: "6-10 weeks",
    equipmentBrands: {
      panels: ["LONGi", "Hanwha Q-Cells", "JA Solar"],
      inverters: ["Enphase", "SolarEdge"],
      batteries: ["Tesla Powerwall", "LG Chem"],
    },
    specialties: ["Lease Programs", "Battery Backup", "Energy Services"],
    customerSatisfaction: 85,
    onTimeCompletion: 82,
    permittingSuccess: 94,
    pros: [
      "Largest residential installer",
      "Low credit score acceptance",
      "Flexible payment options",
      "Wide service area",
    ],
    cons: [
      "Mixed customer reviews",
      "Longer timelines",
      "Service quality varies by region",
    ],
    contactInfo: {
      phone: "1-844-478-6786",
      email: "customercare@sunrun.com",
      website: "https://sunrun.com",
    },
  },
  {
    id: "freedom-solar",
    name: "Freedom Solar",
    logo: "/logos/freedom-solar.png",
    rating: 4.9,
    reviews: 650,
    yearsInBusiness: 12,
    installsCompleted: 18000,
    warranty: {
      workmanship: 25,
      panels: 25,
      inverters: 25,
      batteries: 15,
    },
    pricePerWatt: 2.35,
    financing: {
      available: true,
      options: ["Cash", "Loan"],
      minCreditScore: 650,
      apr: 3.75,
    },
    certifications: [
      "NABCEP",
      "BBB A+",
      "Texas Solar Power Association",
      "Duracell Master Installer",
    ],
    serviceAreas: ["Texas", "Oklahoma"],
    responseTime: "1-2 hours",
    installationTime: "3-4 weeks",
    equipmentBrands: {
      panels: ["Q-Cells", "REC Solar", "Silfab"],
      inverters: ["Enphase", "SolarEdge", "Tesla"],
      batteries: ["Duracell Power Center", "Tesla Powerwall", "Enphase"],
    },
    specialties: ["Local Expert", "Battery Storage", "Fast Installation"],
    customerSatisfaction: 98,
    onTimeCompletion: 97,
    permittingSuccess: 99,
    pros: [
      "Highest customer satisfaction",
      "Fast response and installation",
      "Texas-focused expertise",
      "Competitive pricing",
      "Duracell Master Installer",
    ],
    cons: ["Limited to Texas region", "Fewer reviews than nationals"],
    contactInfo: {
      phone: "1-800-FREEDOM",
      email: "info@freedomsolarpower.com",
      website: "https://freedomsolarpower.com",
    },
  },
];

/**
 * Get all installers
 */
export function getAllInstallers() {
  return MOCK_INSTALLERS;
}

/**
 * Get installer by ID
 */
export function getInstallerById(id) {
  return MOCK_INSTALLERS.find((installer) => installer.id === id);
}

/**
 * Calculate price estimate for a system
 */
export function calculatePriceEstimate(installer, systemSizeKw) {
  const basePrice = installer.pricePerWatt * systemSizeKw * 1000;

  // Add battery cost estimate (60 kWh Duracell)
  const batteryCost = 30000; // ~$30k for 60 kWh

  const totalPrice = basePrice + batteryCost;

  // Federal tax credit (30% through 2032)
  const federalTaxCredit = totalPrice * 0.3;

  // Net cost after incentives
  const netCost = totalPrice - federalTaxCredit;

  return {
    basePrice,
    batteryCost,
    totalPrice,
    federalTaxCredit,
    netCost,
    pricePerWatt: installer.pricePerWatt,
    monthlyPayment: calculateMonthlyPayment(
      netCost,
      installer.financing.apr,
      25,
    ),
  };
}

/**
 * Calculate monthly payment
 */
function calculateMonthlyPayment(principal, annualRate, years) {
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = years * 12;

  if (monthlyRate === 0) return principal / numPayments;

  const monthlyPayment =
    (principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  return Math.round(monthlyPayment);
}

/**
 * Compare installers
 */
export function compareInstallers(installerIds, systemSizeKw = 10) {
  return installerIds
    .map((id) => {
      const installer = getInstallerById(id);
      if (!installer) return null;

      const pricing = calculatePriceEstimate(installer, systemSizeKw);

      return {
        ...installer,
        pricing,
      };
    })
    .filter(Boolean);
}

/**
 * Get recommended installers based on criteria
 */
export function getRecommendedInstallers(criteria = {}) {
  const {
    budget = "mid", // 'low', 'mid', 'high'
    priority = "balanced", // 'price', 'quality', 'speed', 'balanced'
    location = "Texas",
  } = criteria;

  let installers = MOCK_INSTALLERS.filter(
    (installer) =>
      installer.serviceAreas.includes(location) ||
      installer.serviceAreas.includes("All 50 States"),
  );

  // Sort based on priority
  switch (priority) {
    case "price":
      installers.sort((a, b) => a.pricePerWatt - b.pricePerWatt);
      break;
    case "quality":
      installers.sort(
        (a, b) => b.customerSatisfaction - a.customerSatisfaction,
      );
      break;
    case "speed":
      installers.sort((a, b) => {
        const aWeeks = parseInt(a.installationTime.split("-")[0]);
        const bWeeks = parseInt(b.installationTime.split("-")[0]);
        return aWeeks - bWeeks;
      });
      break;
    case "balanced":
    default:
      installers.sort((a, b) => {
        const aScore =
          a.rating * 20 + (100 - a.pricePerWatt * 10) + a.customerSatisfaction;
        const bScore =
          b.rating * 20 + (100 - b.pricePerWatt * 10) + b.customerSatisfaction;
        return bScore - aScore;
      });
  }

  return installers.slice(0, 3);
}

/**
 * Get installer score
 */
export function getInstallerScore(installer) {
  const weights = {
    rating: 0.25,
    customerSatisfaction: 0.25,
    onTimeCompletion: 0.15,
    permittingSuccess: 0.1,
    yearsInBusiness: 0.1,
    priceValue: 0.15,
  };

  const scores = {
    rating: (installer.rating / 5) * 100,
    customerSatisfaction: installer.customerSatisfaction,
    onTimeCompletion: installer.onTimeCompletion,
    permittingSuccess: installer.permittingSuccess,
    yearsInBusiness: Math.min((installer.yearsInBusiness / 20) * 100, 100),
    priceValue: Math.max(100 - (installer.pricePerWatt - 2.0) * 20, 0),
  };

  const totalScore = Object.keys(weights).reduce((sum, key) => {
    return sum + scores[key] * weights[key];
  }, 0);

  return {
    total: Math.round(totalScore),
    breakdown: scores,
  };
}

/**
 * Calculate per-installer ROI projection over N years
 */
export function calculateInstallerROI(
  installer,
  systemSizeKw = 10,
  years = 25,
) {
  const pricing = calculatePriceEstimate(installer, systemSizeKw);
  const sunshineHours = 1800; // TX average
  const efficiency = 0.8;
  const degradation = 0.008;
  const utilityRate = 0.16;
  const utilityEscalator = 0.035;
  const annualUsageKwh = 12000;

  const yearlyData = [];
  let cumulativeSavings = 0;
  let paybackYear = null;

  for (let year = 1; year <= years; year++) {
    const production =
      systemSizeKw *
      sunshineHours *
      efficiency *
      Math.max(1 - degradation * (year - 1), 0.75);
    const currentUtilityRate =
      utilityRate * Math.pow(1 + utilityEscalator, year - 1);
    const utilityCost = currentUtilityRate * annualUsageKwh;
    const solarOffset = Math.min(production, annualUsageKwh);
    const savingsFromSolar = solarOffset * currentUtilityRate;
    const annualLoanPayment = year <= 25 ? pricing.monthlyPayment * 12 : 0;
    const netSavings = savingsFromSolar - annualLoanPayment;
    cumulativeSavings += netSavings;

    if (!paybackYear && cumulativeSavings > 0) {
      paybackYear = year;
    }

    yearlyData.push({
      year,
      production: Math.round(production),
      utilityCost: Math.round(utilityCost),
      savingsFromSolar: Math.round(savingsFromSolar),
      annualLoanPayment: Math.round(annualLoanPayment),
      netSavings: Math.round(netSavings),
      cumulativeSavings: Math.round(cumulativeSavings),
    });
  }

  return {
    installer: installer.name,
    installerId: installer.id,
    netCost: pricing.netCost,
    monthlyPayment: pricing.monthlyPayment,
    paybackYear: paybackYear || years,
    totalSavings25yr: yearlyData[years - 1].cumulativeSavings,
    yearlyData,
  };
}

/**
 * Get match score for an installer based on user preferences
 */
export function getMatchScore(installer, preferences = {}) {
  const {
    budgetPriority = 5, // 1-10, how important is price
    qualityPriority = 5, // 1-10, how important is quality
    speedPriority = 5, // 1-10, how important is speed
    warrantyPriority = 5, // 1-10, how important is warranty
    localPriority = 5, // 1-10, how important is local expertise
  } = preferences;

  const totalWeight =
    budgetPriority +
    qualityPriority +
    speedPriority +
    warrantyPriority +
    localPriority;

  // Price score (lower is better, scale 2.0-3.5 to 100-0)
  const priceScore = Math.max(
    0,
    Math.min(100, ((3.5 - installer.pricePerWatt) / 1.5) * 100),
  );

  // Quality score
  const qualityScore =
    (installer.rating / 5) * 50 + (installer.customerSatisfaction / 100) * 50;

  // Speed score (faster is better, scale 3-10 weeks to 100-0)
  const minWeeks = parseInt(installer.installationTime.split("-")[0]);
  const speedScore = Math.max(0, Math.min(100, ((10 - minWeeks) / 7) * 100));

  // Warranty score (average across categories)
  const avgWarranty =
    (installer.warranty.workmanship +
      installer.warranty.panels +
      installer.warranty.inverters +
      installer.warranty.batteries) /
    4;
  const warrantyScore = Math.min(100, (avgWarranty / 25) * 100);

  // Local expertise score
  const isTexas = installer.serviceAreas.some(
    (a) => a.includes("Texas") || a.includes("All"),
  );
  const localScore = isTexas
    ? installer.serviceAreas.length <= 3
      ? 100
      : 60
    : 30;

  const weightedScore =
    priceScore * (budgetPriority / totalWeight) +
    qualityScore * (qualityPriority / totalWeight) +
    speedScore * (speedPriority / totalWeight) +
    warrantyScore * (warrantyPriority / totalWeight) +
    localScore * (localPriority / totalWeight);

  return {
    total: Math.round(weightedScore),
    breakdown: {
      price: Math.round(priceScore),
      quality: Math.round(qualityScore),
      speed: Math.round(speedScore),
      warranty: Math.round(warrantyScore),
      local: Math.round(localScore),
    },
  };
}

/**
 * Get head-to-head comparison between two installers
 */
export function getHeadToHead(installerId1, installerId2, systemSizeKw = 10) {
  const inst1 = getInstallerById(installerId1);
  const inst2 = getInstallerById(installerId2);
  if (!inst1 || !inst2) return null;

  const pricing1 = calculatePriceEstimate(inst1, systemSizeKw);
  const pricing2 = calculatePriceEstimate(inst2, systemSizeKw);
  const score1 = getInstallerScore(inst1);
  const score2 = getInstallerScore(inst2);

  const categories = [
    {
      name: "Price",
      winner:
        pricing1.netCost <= pricing2.netCost ? installerId1 : installerId2,
      diff: Math.abs(pricing1.netCost - pricing2.netCost),
      unit: "$",
    },
    {
      name: "Rating",
      winner: inst1.rating >= inst2.rating ? installerId1 : installerId2,
      diff: Math.abs(inst1.rating - inst2.rating).toFixed(1),
      unit: "stars",
    },
    {
      name: "Satisfaction",
      winner:
        inst1.customerSatisfaction >= inst2.customerSatisfaction
          ? installerId1
          : installerId2,
      diff: Math.abs(inst1.customerSatisfaction - inst2.customerSatisfaction),
      unit: "%",
    },
    {
      name: "Experience",
      winner:
        inst1.yearsInBusiness >= inst2.yearsInBusiness
          ? installerId1
          : installerId2,
      diff: Math.abs(inst1.yearsInBusiness - inst2.yearsInBusiness),
      unit: "years",
    },
    {
      name: "Speed",
      winner:
        parseInt(inst1.installationTime) <= parseInt(inst2.installationTime)
          ? installerId1
          : installerId2,
      diff: Math.abs(
        parseInt(inst1.installationTime) - parseInt(inst2.installationTime),
      ),
      unit: "weeks",
    },
    {
      name: "Overall Score",
      winner: score1.total >= score2.total ? installerId1 : installerId2,
      diff: Math.abs(score1.total - score2.total),
      unit: "pts",
    },
  ];

  const winsCount = {};
  winsCount[installerId1] = categories.filter(
    (c) => c.winner === installerId1,
  ).length;
  winsCount[installerId2] = categories.filter(
    (c) => c.winner === installerId2,
  ).length;

  return {
    installers: [
      { ...inst1, pricing: pricing1, score: score1 },
      { ...inst2, pricing: pricing2, score: score2 },
    ],
    categories,
    winsCount,
    overallWinner:
      winsCount[installerId1] >= winsCount[installerId2]
        ? installerId1
        : installerId2,
  };
}

export default {
  getAllInstallers,
  getInstallerById,
  calculatePriceEstimate,
  compareInstallers,
  getRecommendedInstallers,
  getInstallerScore,
  calculateInstallerROI,
  getMatchScore,
  getHeadToHead,
};
