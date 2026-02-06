/**
 * Lead Scoring System
 * Prioritizes commercial properties based on solar potential
 */

const { getFirestore } = require("firebase-admin/firestore");

class LeadScorer {
  constructor() {
    this.db = getFirestore();
  }

  /**
   * Calculate lead score (0-100)
   * Higher score = better prospect
   */
  calculateScore(lead) {
    let score = 0;
    const factors = [];

    // 1. ROI Score (30 points max)
    if (lead.solarROI) {
      const roiScore = Math.min(30, (lead.solarROI.roi / 30) * 30);
      score += roiScore;
      factors.push({
        factor: "ROI",
        score: Math.round(roiScore),
        detail: `${lead.solarROI.roi}% annual ROI`,
      });
    }

    // 2. Payback Period (20 points max)
    if (lead.solarROI && lead.paybackYears) {
      let paybackScore = 0;
      if (lead.paybackYears <= 4) paybackScore = 20;
      else if (lead.paybackYears <= 6) paybackScore = 15;
      else if (lead.paybackYears <= 8) paybackScore = 10;
      else if (lead.paybackYears <= 10) paybackScore = 5;

      score += paybackScore;
      factors.push({
        factor: "Payback",
        score: paybackScore,
        detail: `${lead.paybackYears} year payback`,
      });
    }

    // 3. Deal Size (15 points max)
    if (lead.solarROI) {
      const dealSize = lead.solarROI.installationCost;
      let dealScore = 0;

      if (dealSize >= 500000)
        dealScore = 15; // $500k+ = high value
      else if (dealSize >= 250000) dealScore = 12;
      else if (dealSize >= 100000) dealScore = 9;
      else if (dealSize >= 50000) dealScore = 6;
      else dealScore = 3;

      score += dealScore;
      factors.push({
        factor: "Deal Size",
        score: dealScore,
        detail: `$${Math.round(dealSize / 1000)}k system`,
      });
    }

    // 4. Annual Savings (15 points max)
    if (lead.estimatedAnnualSavings) {
      const savingsScore = Math.min(
        15,
        (lead.estimatedAnnualSavings / 50000) * 15,
      );
      score += savingsScore;
      factors.push({
        factor: "Annual Savings",
        score: Math.round(savingsScore),
        detail: `$${Math.round(lead.estimatedAnnualSavings / 1000)}k/year`,
      });
    }

    // 5. Building Size (10 points max)
    if (lead.squareFootage) {
      let sizeScore = 0;
      if (lead.squareFootage >= 200000)
        sizeScore = 10; // 200k+ sqft
      else if (lead.squareFootage >= 100000) sizeScore = 8;
      else if (lead.squareFootage >= 75000) sizeScore = 6;
      else if (lead.squareFootage >= 50000) sizeScore = 4;

      score += sizeScore;
      factors.push({
        factor: "Building Size",
        score: sizeScore,
        detail: `${Math.round(lead.squareFootage / 1000)}k sqft`,
      });
    }

    // 6. Property Type (5 points max)
    const propertyTypeScores = {
      warehouse: 5, // Ideal (flat roofs, high energy use)
      industrial: 5,
      retail: 4, // Good
      office: 3, // Average
      flex: 3,
      medical: 2, // Lower priority (complex requirements)
    };

    const typeScore = propertyTypeScores[lead.propertyType] || 0;
    score += typeScore;
    factors.push({
      factor: "Property Type",
      score: typeScore,
      detail: lead.propertyType,
    });

    // 7. State Solar Incentives (5 points)
    const stateScores = {
      AZ: 5, // Best solar potential
      NM: 5,
      NV: 4,
      CA: 4,
      TX: 3,
      FL: 3,
      GA: 2,
      SC: 2,
      NC: 2,
    };

    const stateScore = stateScores[lead.state] || 0;
    score += stateScore;
    factors.push({
      factor: "State",
      score: stateScore,
      detail: lead.state,
    });

    // Round final score
    score = Math.min(100, Math.round(score));

    return {
      score,
      grade: this.getGrade(score),
      factors,
      scoredAt: new Date().toISOString(),
    };
  }

  /**
   * Convert score to letter grade
   */
  getGrade(score) {
    if (score >= 90) return "A+";
    if (score >= 85) return "A";
    if (score >= 80) return "A-";
    if (score >= 75) return "B+";
    if (score >= 70) return "B";
    if (score >= 65) return "B-";
    if (score >= 60) return "C+";
    if (score >= 55) return "C";
    if (score >= 50) return "C-";
    return "D";
  }

  /**
   * Determine lead priority
   */
  getPriority(score) {
    if (score >= 80) return "hot"; // Contact immediately
    if (score >= 65) return "warm"; // Contact within 2 days
    if (score >= 50) return "medium"; // Contact within 1 week
    return "cold"; // Lower priority
  }

  /**
   * Score all leads in database
   */
  async scoreLeads(batchSize = 100) {
    console.log("🎯 Scoring leads...");

    const snapshot = await this.db
      .collection("commercial_leads")
      .where("solarROI", "!=", null)
      .limit(batchSize)
      .get();

    let scored = 0;
    const scores = [];

    for (const doc of snapshot.docs) {
      const lead = doc.data();

      try {
        const scoreData = this.calculateScore(lead);
        const priority = this.getPriority(scoreData.score);

        await doc.ref.update({
          score: scoreData.score,
          scoreGrade: scoreData.grade,
          scoreFactors: scoreData.factors,
          priority,
          scoredAt: scoreData.scoredAt,
          updatedAt: new Date().toISOString(),
        });

        scores.push(scoreData.score);
        scored++;

        if (scored % 10 === 0) {
          console.log(`   ✓ Scored ${scored}/${snapshot.size} leads`);
        }
      } catch (error) {
        console.error(`   ❌ Error scoring lead ${lead.id}:`, error.message);
      }
    }

    console.log(`✅ Scored ${scored} leads`);

    // Return statistics
    if (scores.length > 0) {
      scores.sort((a, b) => b - a);
      return {
        count: scores.length,
        avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        highScore: scores[0],
        lowScore: scores[scores.length - 1],
        median: scores[Math.floor(scores.length / 2)],
      };
    }

    return { count: 0 };
  }

  /**
   * Get leads by priority
   */
  async getLeadsByPriority(priority = "hot", limit = 50) {
    const snapshot = await this.db
      .collection("commercial_leads")
      .where("priority", "==", priority)
      .orderBy("score", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => doc.data());
  }

  /**
   * Get statistics
   */
  async getStats() {
    const snapshot = await this.db.collection("commercial_leads").get();
    const leads = snapshot.docs.map((doc) => doc.data());
    const scoredLeads = leads.filter((l) => l.score != null);

    const stats = {
      total: leads.length,
      scored: scoredLeads.length,
      byPriority: {
        hot: leads.filter((l) => l.priority === "hot").length,
        warm: leads.filter((l) => l.priority === "warm").length,
        medium: leads.filter((l) => l.priority === "medium").length,
        cold: leads.filter((l) => l.priority === "cold").length,
      },
      byGrade: {},
      avgScore: 0,
      topLeads: [],
    };

    if (scoredLeads.length > 0) {
      stats.avgScore = Math.round(
        scoredLeads.reduce((sum, l) => sum + l.score, 0) / scoredLeads.length,
      );

      // By grade
      scoredLeads.forEach((lead) => {
        const grade = lead.scoreGrade || "N/A";
        stats.byGrade[grade] = (stats.byGrade[grade] || 0) + 1;
      });

      // Top 10 leads
      stats.topLeads = scoredLeads
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map((l) => ({
          id: l.id,
          propertyName: l.propertyName,
          city: l.city,
          state: l.state,
          score: l.score,
          grade: l.scoreGrade,
          systemSize: l.systemSize,
          annualSavings: l.estimatedAnnualSavings,
        }));
    }

    return stats;
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  const scorer = new LeadScorer();

  if (args.includes("--score")) {
    const batchSize = parseInt(args[args.indexOf("--batch-size") + 1]) || 100;
    const result = await scorer.scoreLeads(batchSize);
    console.log("\n📊 Scoring Results:");
    console.log(JSON.stringify(result, null, 2));
  } else if (args.includes("--stats")) {
    const stats = await scorer.getStats();
    console.log("\n📊 Lead Scoring Statistics:");
    console.log(JSON.stringify(stats, null, 2));
  } else if (args.includes("--list")) {
    const priority = args[args.indexOf("--priority") + 1] || "hot";
    const limit = parseInt(args[args.indexOf("--limit") + 1]) || 50;
    const leads = await scorer.getLeadsByPriority(priority, limit);
    console.log(`\n🔥 ${priority.toUpperCase()} Leads (${leads.length}):`);
    leads.forEach((lead, i) => {
      console.log(
        `${i + 1}. ${lead.propertyName} - ${lead.city}, ${lead.state}`,
      );
      console.log(
        `   Score: ${lead.score} (${lead.scoreGrade}) | ${lead.systemSize}kW | $${Math.round(lead.estimatedAnnualSavings / 1000)}k/yr savings`,
      );
    });
  } else {
    console.log("Usage:");
    console.log("  node lead-scorer.js --score [--batch-size 100]");
    console.log("  node lead-scorer.js --stats");
    console.log("  node lead-scorer.js --list --priority hot [--limit 50]");
  }

  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = LeadScorer;
