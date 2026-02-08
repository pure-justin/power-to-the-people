import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Referral Notification Service
 * Handles email notifications and updates for referral milestones
 */

// Email templates for different notification types
const emailTemplates = {
  referralSignup: (referrerName, referredName) => ({
    subject: "🎉 New Referral Signed Up!",
    body: `Hi ${referrerName},

Great news! ${referredName} just signed up using your referral link!

They're now in the qualification process. We'll keep you updated as they progress through the program.

Current Status: Signed Up ✅

Track your referrals at: ${window.location.origin}/referrals

Keep sharing your link to earn more rewards!

- Power to the People Team`,
  }),

  referralQualified: (referrerName, referredName) => ({
    subject: "💰 Your Referral Qualified!",
    body: `Hi ${referrerName},

Excellent news! ${referredName} has been qualified for the program!

They're now eligible for a free battery system and you're one step closer to earning your referral bonus.

Next Step: Site Survey
Your Potential Earnings: $50 (after site survey) + $450 (after installation) = $500 total

Track your earnings at: ${window.location.origin}/referrals

- Power to the People Team`,
  }),

  referralSiteSurvey: (referrerName, referredName, earnings) => ({
    subject: "🏆 You Earned $50!",
    body: `Hi ${referrerName},

Congratulations! ${referredName} just completed their site survey!

You've earned: $50 💵
Pending balance: $${earnings}

Your referral is progressing well! Once the battery system is installed, you'll earn an additional $450.

Track your earnings at: ${window.location.origin}/referrals

Keep up the great work!

- Power to the People Team`,
  }),

  referralInstalled: (referrerName, referredName, totalEarnings) => ({
    subject: "🎊 Installation Complete - You Earned $450!",
    body: `Hi ${referrerName},

Amazing news! ${referredName}'s battery system has been installed!

You've earned: $450 💰
Total earned from this referral: $500
Your total balance: $${totalEarnings}

This is a huge milestone! You can request a payout anytime from your referrals dashboard.

View your earnings: ${window.location.origin}/referrals

Thank you for being an amazing advocate!

- Power to the People Team`,
  }),

  milestoneReached: (referrerName, milestone, reward) => ({
    subject: `🏅 Milestone Unlocked: ${milestone}!`,
    body: `Hi ${referrerName},

Congratulations! You've reached a major milestone!

Achievement: ${milestone}
Bonus Reward: ${reward}

You're crushing it! Keep sharing your referral link to unlock even more rewards.

View your progress: ${window.location.origin}/referrals

- Power to the People Team`,
  }),

  payoutProcessed: (referrerName, amount, method) => ({
    subject: "💳 Payout Processed Successfully",
    body: `Hi ${referrerName},

Your payout has been processed!

Amount: $${amount}
Method: ${method}
Processing Time: 3-5 business days

Thank you for being part of Power to the People!

View your earnings history: ${window.location.origin}/referrals

- Power to the People Team`,
  }),

  weeklyDigest: (referrerName, stats) => ({
    subject: "📊 Your Weekly Referral Summary",
    body: `Hi ${referrerName},

Here's your referral activity for the past week:

New Referrals: ${stats.newReferrals}
Qualified: ${stats.qualified}
Installed: ${stats.installed}
Earnings This Week: $${stats.weeklyEarnings}
Total Earnings: $${stats.totalEarnings}

Your Stats:
- Total Referrals: ${stats.totalReferrals}
- Conversion Rate: ${stats.conversionRate}%
- Pending Balance: $${stats.pendingBalance}

Keep sharing! Every referral gets you closer to the next milestone.

View full dashboard: ${window.location.origin}/referrals

- Power to the People Team`,
  }),
};

/**
 * Send email notification using a Cloud Function or email API
 * In production, this would trigger a Cloud Function that sends via SendGrid/Mailgun
 */
export const sendReferralNotification = async (type, recipientEmail, data) => {
  try {
    // Get the appropriate template
    const template = emailTemplates[type];
    if (!template) {
      throw new Error(`Unknown notification type: ${type}`);
    }

    const { subject, body } = template(...Object.values(data));

    // Log for development (in production, this would call a Cloud Function)
    console.log("📧 Sending email notification:", {
      to: recipientEmail,
      subject,
      body: body.substring(0, 100) + "...",
    });

    // TODO: Implement actual email sending via Cloud Function
    // Example:
    // await fetch('https://your-cloud-function-url/sendEmail', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ to: recipientEmail, subject, body })
    // });

    // For now, store notification in Firestore so we can send it later
    await storeNotification(recipientEmail, type, subject, body);

    return { success: true };
  } catch (error) {
    console.error("Error sending notification:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Store notification in Firestore for batch processing
 */
const storeNotification = async (email, type, subject, body) => {
  try {
    const notificationRef = doc(
      db,
      "pendingNotifications",
      `${Date.now()}_${email}`,
    );
    await updateDoc(notificationRef, {
      email,
      type,
      subject,
      body,
      sent: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error storing notification:", error);
  }
};

/**
 * Check if user should receive milestone notification
 */
export const checkMilestones = async (userId, installedCount) => {
  const milestones = [
    { count: 1, reward: "First Referral Badge" },
    { count: 5, reward: "$100 Bonus" },
    { count: 10, reward: "Bronze Status" },
    { count: 25, reward: "$500 Bonus" },
    { count: 50, reward: "Silver Status" },
    { count: 100, reward: "$2,000 Bonus" },
  ];

  const milestone = milestones.find((m) => m.count === installedCount);

  if (milestone) {
    // User just hit a milestone!
    return milestone;
  }

  return null;
};

/**
 * Send notification when referral status changes
 */
export const notifyReferralStatusChange = async (
  referrerId,
  referrerEmail,
  referrerName,
  referredName,
  newStatus,
  earnings,
) => {
  const notificationTypes = {
    signed_up: "referralSignup",
    qualified: "referralQualified",
    site_survey: "referralSiteSurvey",
    installed: "referralInstalled",
  };

  const notificationType = notificationTypes[newStatus];
  if (!notificationType) return;

  const data =
    newStatus === "site_survey" || newStatus === "installed"
      ? { referrerName, referredName, earnings }
      : { referrerName, referredName };

  await sendReferralNotification(notificationType, referrerEmail, data);
};

/**
 * Send weekly digest email
 */
export const sendWeeklyDigest = async (userId, referrerEmail, stats) => {
  await sendReferralNotification("weeklyDigest", referrerEmail, {
    referrerName: stats.name,
    stats,
  });
};

/**
 * Send payout confirmation
 */
export const notifyPayoutProcessed = async (
  referrerEmail,
  referrerName,
  amount,
  method,
) => {
  await sendReferralNotification("payoutProcessed", referrerEmail, {
    referrerName,
    amount,
    method,
  });
};

/**
 * Generate shareable referral content for social media
 */
export const generateSocialContent = (referralCode, platform) => {
  const baseUrl = window.location.origin;
  const link = `${baseUrl}/qualify?ref=${referralCode}`;

  const content = {
    twitter: {
      text: "🔋 Just got approved for a FREE home battery backup through @PowerToThePeople! Earn passive income by selling power back to the grid + backup during outages. Check it out:",
      url: link,
      hashtags: [
        "CleanEnergy",
        "EnergyCommunity",
        "SolarPower",
        "BatteryStorage",
      ],
    },
    facebook: {
      text: `I just got approved for a completely FREE home battery system! 🎉\n\nNo catch - they're building a virtual power plant and paying homeowners to participate. Benefits:\n\n✅ Free installation & equipment\n✅ Backup power during outages  \n✅ Earn money selling power back\n✅ Lower energy bills\n\nSee if you qualify:`,
      url: link,
    },
    linkedin: {
      text: `Excited to share that I'm participating in an innovative virtual power plant program! Power to the People is enrolling homeowners for free battery installations.\n\nThis is the future of distributed energy - turning homes into grid assets while providing backup power and passive income.\n\nLearn more:`,
      url: link,
    },
    email: {
      subject: "Get Free Battery Backup for Your Home!",
      body: `Hey!\n\nI just qualified for a free home battery backup through Power to the People. You should check it out too!\n\nIt's completely free and you get:\n- Free battery installation\n- Backup power during outages\n- Earn money selling power back to the grid\n- Lower energy bills\n\nSee if you qualify here: ${link}\n\nIt takes just 5 minutes to check eligibility!`,
    },
    sms: {
      text: `Check this out - free battery backup for your home! I just got approved. See if you qualify: ${link}`,
    },
  };

  return content[platform] || content.sms;
};

/**
 * Track referral link clicks (for analytics)
 */
export const trackReferralClick = async (referralCode, source = "unknown") => {
  try {
    const clickRef = doc(db, "referralClicks", `${Date.now()}_${referralCode}`);
    await updateDoc(clickRef, {
      referralCode,
      source, // e.g., 'facebook', 'twitter', 'email', 'direct'
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent,
      referrer: document.referrer,
    });
  } catch (error) {
    console.error("Error tracking click:", error);
  }
};

export default {
  sendReferralNotification,
  checkMilestones,
  notifyReferralStatusChange,
  sendWeeklyDigest,
  notifyPayoutProcessed,
  generateSocialContent,
  trackReferralClick,
};
