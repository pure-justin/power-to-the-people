import {
  collection,
  query,
  getDocs,
  orderBy,
  where,
  limit,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Get all leads for admin dashboard
 * Returns leads ordered by creation date (newest first)
 */
export const getAdminProjects = async () => {
  try {
    if (!db) throw new Error("Firestore not initialized");

    // Query leads collection
    const leadsRef = collection(db, "leads");
    const q = query(leadsRef, orderBy("createdAt", "desc"), limit(500));

    const querySnapshot = await getDocs(q);

    const leads = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Normalize the data structure for both residential and commercial leads
      leads.push({
        id: doc.id,
        // Common fields
        status: data.status || 'new',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        
        // Customer info (handle both structures)
        customerName: data.name || data.propertyName || data.customer?.organizationName || 'Unknown',
        email: data.email || data.customer?.email || data.contactInfo?.email || '',
        phone: data.phone || data.contactInfo?.phone || '',
        
        // Address (handle both structures)
        address: typeof data.address === 'string' 
          ? data.address 
          : data.address?.formattedAddress || '',
        zipCode: data.zipCode || data.address?.zipCode || '',
        
        // Lead type
        leadType: data.leadType || (data.isCommercial ? 'commercial' : 'residential'),
        isCommercial: data.isCommercial || false,
        
        // Solar specific
        systemSize: data.systemDesign?.maxPanelCapacity 
          ? (data.systemDesign.maxPanelCapacity * 0.4 / 1000).toFixed(1) // Convert panels to kW
          : data.systemSize || '',
        estimatedSavings: data.systemDesign?.estimatedAnnualSavings || '',
        
        // Scoring
        leadScore: data.leadScore || data.qualityScore || 0,
        qualityTier: data.qualityTier || '',
        priority: data.priority || 'normal',
        
        // Source tracking
        source: data.source || data.tracking?.source || 'website',
        campaign: data.tracking?.campaign || data.utmCampaign || '',
        
        // Property info (commercial)
        propertyType: data.propertyType || '',
        propertyName: data.propertyName || '',
        
        // Raw data for details
        _raw: data,
      });
    });

    console.log(`Admin: Loaded ${leads.length} leads`);
    return leads;
  } catch (error) {
    console.error("Error fetching admin leads:", error);
    throw error;
  }
};

/**
 * Get admin dashboard statistics
 */
export const getAdminStats = async () => {
  try {
    const leads = await getAdminProjects();

    const totalProjects = leads.length;

    // Count by type
    const residential = leads.filter(l => !l.isCommercial).length;
    const commercial = leads.filter(l => l.isCommercial).length;

    // New this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = leads.filter((l) => {
      const createdDate = l.createdAt?.toDate?.() || new Date(0);
      return createdDate >= startOfMonth;
    }).length;

    // Active customers (unique emails)
    const activeEmails = new Set();
    leads.forEach((l) => {
      if (l.email) activeEmails.add(l.email);
    });
    const activeCustomers = activeEmails.size;

    // Calculate total potential capacity
    const totalCapacity = leads
      .filter((l) => l.systemSize)
      .reduce((sum, l) => sum + (parseFloat(l.systemSize) || 0), 0)
      .toFixed(1);

    // Calculate total potential savings
    const totalSavings = leads
      .filter((l) => l.estimatedSavings)
      .reduce((sum, l) => sum + (parseFloat(l.estimatedSavings) || 0), 0);

    // Average lead score
    const scoredLeads = leads.filter(l => l.leadScore > 0);
    const avgLeadScore = scoredLeads.length > 0
      ? Math.round(scoredLeads.reduce((sum, l) => sum + l.leadScore, 0) / scoredLeads.length)
      : 0;

    return {
      totalProjects,
      residential,
      commercial,
      newThisMonth,
      activeCustomers,
      customerGrowth: newThisMonth > 0 ? Math.round((newThisMonth / totalProjects) * 100) : 0,
      totalCapacity,
      estimatedRevenue: totalSavings.toLocaleString(),
      avgLeadScore,
    };
  } catch (error) {
    console.error("Error calculating admin stats:", error);
    throw error;
  }
};

/**
 * Update lead status
 */
export const updateProjectStatus = async (leadId, newStatus) => {
  try {
    if (!db) throw new Error("Firestore not initialized");

    const leadRef = doc(db, "leads", leadId);
    await updateDoc(leadRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });

    console.log(`Admin: Updated lead ${leadId} status to ${newStatus}`);
    return true;
  } catch (error) {
    console.error("Error updating lead status:", error);
    throw error;
  }
};

/**
 * Get leads by status
 */
export const getProjectsByStatus = async (status) => {
  try {
    if (!db) throw new Error("Firestore not initialized");

    const leadsRef = collection(db, "leads");
    const q = query(
      leadsRef,
      where("status", "==", status),
      orderBy("createdAt", "desc"),
    );

    const querySnapshot = await getDocs(q);

    const leads = [];
    querySnapshot.forEach((doc) => {
      leads.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return leads;
  } catch (error) {
    console.error("Error fetching leads by status:", error);
    throw error;
  }
};

/**
 * Search leads
 */
export const searchProjects = async (searchTerm) => {
  try {
    const leads = await getAdminProjects();

    const lowerSearch = searchTerm.toLowerCase();
    return leads.filter(
      (l) =>
        l.customerName?.toLowerCase().includes(lowerSearch) ||
        l.email?.toLowerCase().includes(lowerSearch) ||
        l.phone?.includes(searchTerm) ||
        l.address?.toLowerCase().includes(lowerSearch) ||
        l.propertyName?.toLowerCase().includes(lowerSearch) ||
        l.id.toLowerCase().includes(lowerSearch),
    );
  } catch (error) {
    console.error("Error searching leads:", error);
    throw error;
  }
};

export default {
  getAdminProjects,
  getAdminStats,
  updateProjectStatus,
  getProjectsByStatus,
  searchProjects,
};
