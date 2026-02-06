#!/usr/bin/env node

/**
 * AUTOMATED LEAD PIPELINE SCHEDULER
 *
 * Runs the lead generation pipeline on a schedule
 * Can be run as a cron job or standalone daemon
 *
 * Usage:
 *   node scripts/schedule-lead-pipeline.js --mode=cron    # Run once (for cron)
 *   node scripts/schedule-lead-pipeline.js --mode=daemon  # Run as daemon
 *   node scripts/schedule-lead-pipeline.js --now          # Run immediately
 */

import { spawn } from "child_process";
import { writeFileSync, readFileSync, existsSync } from "fs";

const STATE_FILE = ".lead-pipeline-state.json";

const CONFIG = {
  mode:
    process.argv.find((arg) => arg.startsWith("--mode="))?.split("=")[1] ||
    "cron",
  runNow: process.argv.includes("--now"),
  schedule: {
    hour: 2, // 2 AM daily
    dailyTarget: 100, // Generate 100 new leads per day
    weeklyTarget: 500, // Refresh 500 total leads per week
  },
  maxDailyRuns: 1,
};

/**
 * Load pipeline state
 */
function loadState() {
  if (existsSync(STATE_FILE)) {
    return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
  }
  return {
    lastRun: null,
    totalLeadsGenerated: 0,
    totalRuns: 0,
    lastWeekReset: new Date().toISOString(),
    weeklyLeads: 0,
  };
}

/**
 * Save pipeline state
 */
function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Check if we should run
 */
function shouldRun(state) {
  if (CONFIG.runNow) {
    return true;
  }

  // Check if already ran today
  if (state.lastRun) {
    const lastRun = new Date(state.lastRun);
    const now = new Date();

    // Same day?
    if (
      lastRun.getDate() === now.getDate() &&
      lastRun.getMonth() === now.getMonth() &&
      lastRun.getFullYear() === now.getFullYear()
    ) {
      console.log("⏭️  Pipeline already ran today. Skipping...");
      return false;
    }
  }

  // Check weekly reset
  const weeksSinceReset = Math.floor(
    (Date.now() - new Date(state.lastWeekReset).getTime()) /
      (7 * 24 * 60 * 60 * 1000),
  );

  if (weeksSinceReset >= 1) {
    console.log("🔄 Weekly reset - starting fresh");
    state.weeklyLeads = 0;
    state.lastWeekReset = new Date().toISOString();
  }

  // Check if we've hit weekly target
  if (state.weeklyLeads >= CONFIG.schedule.weeklyTarget) {
    console.log(
      `✅ Weekly target reached (${state.weeklyLeads}/${CONFIG.schedule.weeklyTarget}). Skipping...`,
    );
    return false;
  }

  return true;
}

/**
 * Run the pipeline
 */
function runPipeline() {
  return new Promise((resolve, reject) => {
    console.log("\n" + "=".repeat(60));
    console.log("🚀 STARTING AUTOMATED LEAD GENERATION PIPELINE");
    console.log("=".repeat(60) + "\n");
    console.log(`📅 ${new Date().toISOString()}\n`);

    const state = loadState();
    const target = Math.min(
      CONFIG.schedule.dailyTarget,
      CONFIG.schedule.weeklyTarget - state.weeklyLeads,
    );

    console.log(`📊 Target: ${target} new leads`);
    console.log(
      `📈 Weekly progress: ${state.weeklyLeads}/${CONFIG.schedule.weeklyTarget}\n`,
    );

    const args = [
      "scripts/automated-lead-pipeline.js",
      `--target=${target}`,
      "--mode=hybrid",
    ];

    const child = spawn("node", args, {
      stdio: "inherit",
      cwd: process.cwd(),
    });

    child.on("close", (code) => {
      if (code === 0) {
        // Update state
        state.lastRun = new Date().toISOString();
        state.totalRuns++;
        state.totalLeadsGenerated += target;
        state.weeklyLeads += target;
        saveState(state);

        console.log("\n" + "=".repeat(60));
        console.log("✅ PIPELINE COMPLETE");
        console.log("=".repeat(60));
        console.log(`📊 Session stats:`);
        console.log(`   Generated: ${target} leads`);
        console.log(`   Total runs: ${state.totalRuns}`);
        console.log(`   All-time leads: ${state.totalLeadsGenerated}`);
        console.log(
          `   Weekly progress: ${state.weeklyLeads}/${CONFIG.schedule.weeklyTarget}`,
        );
        console.log(`   Next run: Tomorrow at ${CONFIG.schedule.hour}:00 AM\n`);

        resolve({ success: true, leadsGenerated: target });
      } else {
        console.error(`\n❌ Pipeline failed with code ${code}`);
        reject(new Error(`Pipeline failed with code ${code}`));
      }
    });

    child.on("error", (error) => {
      console.error(`\n❌ Failed to start pipeline:`, error);
      reject(error);
    });
  });
}

/**
 * Main scheduler
 */
async function main() {
  console.log("🤖 Lead Pipeline Scheduler");
  console.log(`Mode: ${CONFIG.mode}\n`);

  const state = loadState();

  console.log("📊 Current State:");
  console.log(`   Last run: ${state.lastRun || "Never"}`);
  console.log(`   Total runs: ${state.totalRuns}`);
  console.log(`   Total leads: ${state.totalLeadsGenerated}`);
  console.log(
    `   Weekly leads: ${state.weeklyLeads}/${CONFIG.schedule.weeklyTarget}\n`,
  );

  if (CONFIG.mode === "daemon") {
    console.log("👹 Running in daemon mode...");
    console.log(`⏰ Schedule: Daily at ${CONFIG.schedule.hour}:00 AM`);
    console.log(`📅 Target: ${CONFIG.schedule.dailyTarget} leads/day\n`);

    // Run daemon
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === CONFIG.schedule.hour && now.getMinutes() === 0) {
        const currentState = loadState();
        if (shouldRun(currentState)) {
          runPipeline().catch((error) => {
            console.error("Pipeline error:", error);
          });
        }
      }
    }, 60 * 1000); // Check every minute

    // Keep alive
    process.on("SIGINT", () => {
      console.log("\n\n👋 Shutting down scheduler...");
      process.exit(0);
    });
  } else {
    // Cron mode - run once
    if (shouldRun(state)) {
      try {
        await runPipeline();
        process.exit(0);
      } catch (error) {
        console.error("Pipeline error:", error);
        process.exit(1);
      }
    } else {
      console.log("Scheduler check complete. No action needed.");
      process.exit(0);
    }
  }
}

main().catch((error) => {
  console.error("Scheduler error:", error);
  process.exit(1);
});
