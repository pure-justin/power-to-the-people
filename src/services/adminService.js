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
 * Get all projects for admin dashboard
 * Returns projects ordered by creation date (newest first)
 */
export const getAdminProjects = async () => {
  try {
    if (!db) throw new Error("Firestore not initialized");

    // Query all projects, ordered by creation date
    const projectsRef = collection(db, "projects");
    const q = query(projectsRef, orderBy("createdAt", "desc"));

    const querySnapshot = await getDocs(q);

    const projects = [];
    querySnapshot.forEach((doc) => {
      projects.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    console.log(`Admin: Loaded ${projects.length} projects`);
    return projects;
  } catch (error) {
    console.error("Error fetching admin projects:", error);

    // If Firestore fails, return mock data for development
    if (process.env.NODE_ENV === "development") {
      console.warn("Using mock data for development");
      return getMockProjects();
    }

    throw error;
  }
};

/**
 * Get admin dashboard statistics
 * Calculates metrics from project data
 */
export const getAdminStats = async () => {
  try {
    const projects = await getAdminProjects();

    // Calculate total projects
    const totalProjects = projects.length;

    // Calculate projects created this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = projects.filter((p) => {
      const createdDate = p.createdAt?.toDate?.() || new Date(0);
      return createdDate >= startOfMonth;
    }).length;

    // Calculate active customers (unique emails with non-cancelled projects)
    const activeEmails = new Set();
    projects.forEach((p) => {
      if (p.email && p.status !== "cancelled") {
        activeEmails.add(p.email);
      }
    });
    const activeCustomers = activeEmails.size;

    // Calculate customer growth (mock for now, would need historical data)
    const customerGrowth =
      newThisMonth > 0 ? Math.round((newThisMonth / totalProjects) * 100) : 0;

    // Calculate total capacity (sum of system sizes)
    const totalCapacity = projects
      .filter((p) => p.systemSize && p.status !== "cancelled")
      .reduce((sum, p) => sum + (parseFloat(p.systemSize) || 0), 0)
      .toFixed(1);

    // Estimate revenue (mock calculation: $500 per kW)
    const estimatedRevenue = (totalCapacity * 500).toLocaleString();

    return {
      totalProjects,
      newThisMonth,
      activeCustomers,
      customerGrowth,
      totalCapacity,
      estimatedRevenue,
    };
  } catch (error) {
    console.error("Error calculating admin stats:", error);

    // Return mock stats for development
    if (process.env.NODE_ENV === "development") {
      return {
        totalProjects: 12,
        newThisMonth: 4,
        activeCustomers: 10,
        customerGrowth: 25,
        totalCapacity: "84.5",
        estimatedRevenue: "42,250",
      };
    }

    throw error;
  }
};

/**
 * Update project status
 */
export const updateProjectStatus = async (projectId, newStatus) => {
  try {
    if (!db) throw new Error("Firestore not initialized");

    const projectRef = doc(db, "projects", projectId);
    await updateDoc(projectRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });

    console.log(`Admin: Updated project ${projectId} status to ${newStatus}`);
    return true;
  } catch (error) {
    console.error("Error updating project status:", error);
    throw error;
  }
};

/**
 * Get projects by status
 */
export const getProjectsByStatus = async (status) => {
  try {
    if (!db) throw new Error("Firestore not initialized");

    const projectsRef = collection(db, "projects");
    const q = query(
      projectsRef,
      where("status", "==", status),
      orderBy("createdAt", "desc"),
    );

    const querySnapshot = await getDocs(q);

    const projects = [];
    querySnapshot.forEach((doc) => {
      projects.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return projects;
  } catch (error) {
    console.error("Error fetching projects by status:", error);
    throw error;
  }
};

/**
 * Search projects by customer name or email
 */
export const searchProjects = async (searchTerm) => {
  try {
    // For now, we'll fetch all projects and filter client-side
    // In production, consider using Algolia or Elasticsearch for better search
    const projects = await getAdminProjects();

    const lowerSearch = searchTerm.toLowerCase();
    return projects.filter(
      (p) =>
        p.customerName?.toLowerCase().includes(lowerSearch) ||
        p.email?.toLowerCase().includes(lowerSearch) ||
        p.phone?.includes(searchTerm) ||
        p.id.toLowerCase().includes(lowerSearch),
    );
  } catch (error) {
    console.error("Error searching projects:", error);
    throw error;
  }
};

/**
 * Mock project data for development
 */
const getMockProjects = () => {
  const statuses = [
    "submitted",
    "reviewing",
    "approved",
    "scheduled",
    "completed",
  ];
  const names = [
    "John Smith",
    "Sarah Johnson",
    "Michael Brown",
    "Emily Davis",
    "David Wilson",
    "Jennifer Martinez",
    "Robert Anderson",
    "Lisa Taylor",
    "James Thomas",
    "Maria Garcia",
    "William Moore",
    "Jessica Lee",
  ];
  const addresses = [
    "123 Oak Street, Austin, TX 78701",
    "456 Elm Avenue, Dallas, TX 75201",
    "789 Pine Road, Houston, TX 77001",
    "321 Maple Drive, San Antonio, TX 78201",
    "654 Cedar Lane, Fort Worth, TX 76101",
    "987 Birch Court, El Paso, TX 79901",
    "147 Willow Way, Arlington, TX 76001",
    "258 Spruce Street, Corpus Christi, TX 78401",
    "369 Ash Boulevard, Plano, TX 75001",
    "741 Cherry Circle, Laredo, TX 78040",
    "852 Walnut Place, Lubbock, TX 79401",
    "963 Hickory Drive, Irving, TX 75001",
  ];

  return names.map((name, index) => {
    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 90)); // Random date within last 90 days

    return {
      id: `PTTP-${Date.now() - index * 100000}`,
      customerName: name,
      email: `${name.toLowerCase().replace(" ", ".")}@example.com`,
      phone: `512-555-${String(1000 + index).padStart(4, "0")}`,
      address: addresses[index],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      systemSize: (5 + Math.random() * 10).toFixed(1), // 5-15 kW
      batterySize: (10 + Math.random() * 20).toFixed(1), // 10-30 kWh
      createdAt: {
        toDate: () => createdDate,
      },
    };
  });
};

export default {
  getAdminProjects,
  getAdminStats,
  updateProjectStatus,
  getProjectsByStatus,
  searchProjects,
};
