/**
 * Ava AI Agent Service
 * Connects to the Ava Dashboard API for monitoring
 */

// Ava Dashboard API endpoint (Mac Studio via Tailscale)
const AVA_API_BASE = 'http://100.124.119.18:5055';

/**
 * Get Ava's current status and activity
 */
export const getAvaStatus = async () => {
  try {
    const response = await fetch(`${AVA_API_BASE}/api/status`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch Ava status:', error);
    return {
      running: false,
      error: error.message,
      tasks: { total: 0, completed: 0, pending: 0, in_progress: 0, failed: 0 },
      activity: { total: 0, by_type: {} },
      logs: [],
    };
  }
};

/**
 * Get Ava's task history
 */
export const getAvaTasks = async () => {
  try {
    const response = await fetch(`${AVA_API_BASE}/api/tasks`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch Ava tasks:', error);
    return [];
  }
};

/**
 * Get Ava's activity feed
 */
export const getAvaActivity = async () => {
  try {
    const response = await fetch(`${AVA_API_BASE}/api/activity`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch Ava activity:', error);
    return [];
  }
};

/**
 * Format uptime string
 */
export const formatUptime = (uptime) => {
  if (!uptime) return 'Unknown';
  return uptime;
};

/**
 * Get status color based on state
 */
export const getStatusColor = (running) => {
  return running ? 'text-green-500' : 'text-red-500';
};

/**
 * Get activity type color
 */
export const getActivityTypeColor = (type) => {
  const colors = {
    build: 'bg-blue-100 text-blue-800',
    build_shipped: 'bg-green-100 text-green-800',
    solar_build: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    system: 'bg-gray-100 text-gray-800',
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
};
