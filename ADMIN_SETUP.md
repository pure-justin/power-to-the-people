# Admin Dashboard Setup Guide

The Admin Dashboard provides a comprehensive interface for managing customer projects, tracking performance metrics, and monitoring the Power to the People VPP program.

## Features

### 🔐 Authentication
- Secure email/password login
- Role-based access control (admin role required)
- Auto-logout on unauthorized access

### 📊 Dashboard Analytics
- **Total Projects**: Count of all submitted applications
- **Active Customers**: Unique customers with active projects
- **Total Capacity**: Sum of installed system capacity (kW)
- **Revenue Estimates**: VPP program value calculations

### 📋 Project Management
- View all customer projects in a sortable table
- Real-time search across:
  - Project IDs
  - Customer names
  - Email addresses
  - Physical addresses
- Filter by status:
  - Submitted
  - Reviewing
  - Approved
  - Scheduled
  - Completed
  - Cancelled
- Export to CSV for reporting
- Quick navigation to project details

### 🎨 UI/UX Features
- Responsive design (mobile, tablet, desktop)
- Status badges with color coding
- Loading states and error handling
- Empty state messages
- Refresh button with animation
- Clean, modern interface

## Setup Instructions

### Step 1: Create Admin User

You have two options to create an admin user:

#### Option A: Manual Setup (Recommended)

1. **Create Firebase Auth User**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Navigate to Authentication > Users
   - Click "Add user"
   - Enter email: `admin@powertothepeople.com` (or your choice)
   - Enter password: `[SecurePassword123]`
   - Click "Add user"
   - Copy the User UID

2. **Create Firestore Document**
   - Navigate to Firestore Database
   - Go to the `users` collection
   - Click "Add document"
   - Document ID: Paste the UID from step 1
   - Add fields:
     ```
     email (string): "admin@powertothepeople.com"
     displayName (string): "Admin User"
     role (string): "admin"
     createdAt (timestamp): [current time]
     ```
   - Click "Save"

#### Option B: Script Setup

If you have Firebase Admin SDK credentials:

```bash
# Install firebase-admin if not already installed
npm install firebase-admin

# Run the script
node scripts/create-admin.js admin@example.com SecurePass123 "Admin User"
```

### Step 2: Configure Firestore Security Rules

Update your Firestore security rules to protect admin data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is admin
    function isAdmin() {
      return request.auth != null &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Users collection - users can read their own data, admins can read all
    match /users/{userId} {
      allow read: if request.auth.uid == userId || isAdmin();
      allow write: if request.auth.uid == userId || isAdmin();
    }

    // Projects collection - public read for customers, admin write
    match /projects/{projectId} {
      allow read: if true; // Customers can view their projects
      allow create: if true; // Anyone can submit
      allow update, delete: if isAdmin(); // Only admins can modify
    }

    // Address cache - public read, admin write
    match /addressCache/{addressId} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
```

### Step 3: Access the Dashboard

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:5173/admin`

3. Login with your admin credentials

## File Structure

```
src/
├── pages/
│   └── Admin.jsx              # Main admin dashboard component
├── services/
│   ├── adminService.js        # Admin data fetching and stats
│   └── firebase.js            # Firebase configuration
└── App.jsx                    # Updated with /admin route

scripts/
└── create-admin.js            # Helper script to create admin users
```

## API Reference

### Admin Service Functions

```javascript
// Get all projects
const projects = await getAdminProjects();

// Get dashboard statistics
const stats = await getAdminStats();

// Update project status
await updateProjectStatus(projectId, 'approved');

// Get projects by status
const reviewing = await getProjectsByStatus('reviewing');

// Search projects
const results = await searchProjects('john@example.com');
```

## Development Mode

The admin service includes mock data fallback for development:

```javascript
// In adminService.js
if (process.env.NODE_ENV === 'development') {
  return getMockProjects(); // Returns 12 sample projects
}
```

This allows you to test the UI without real Firestore data.

## Security Best Practices

1. **Strong Passwords**: Require complex passwords for admin accounts
2. **2FA**: Enable two-factor authentication in Firebase Console
3. **IP Whitelist**: Restrict admin access to specific IP ranges (via Firebase)
4. **Audit Logs**: Monitor admin actions via Firestore audit logs
5. **Regular Reviews**: Periodically review admin user list
6. **Least Privilege**: Only grant admin role when necessary

## Customization

### Adding New Metrics

Edit `src/services/adminService.js`:

```javascript
export const getAdminStats = async () => {
  const projects = await getAdminProjects();

  // Add your custom metric
  const customMetric = projects.filter(p => /* your logic */).length;

  return {
    totalProjects,
    customMetric, // Add to return object
    // ... other metrics
  };
};
```

Then update `src/pages/Admin.jsx` to display it:

```jsx
<div className="stat-card">
  <div className="stat-header">
    <span className="stat-label">Custom Metric</span>
    <div className="stat-icon">
      <YourIcon size={20} />
    </div>
  </div>
  <div className="stat-value">{stats.customMetric}</div>
</div>
```

### Adding New Status Filters

Update the status filter select in `Admin.jsx`:

```jsx
<select className="filter-select" value={statusFilter} onChange={...}>
  <option value="all">All Status</option>
  <option value="your-status">Your Status</option>
  {/* Add more options */}
</select>
```

### Customizing Table Columns

Modify the table in `Admin.jsx`:

```jsx
<table className="projects-table">
  <thead>
    <tr>
      <th>Your Column</th>
      {/* Add more headers */}
    </tr>
  </thead>
  <tbody>
    {filteredProjects.map((project) => (
      <tr key={project.id}>
        <td>{project.yourField}</td>
        {/* Add more cells */}
      </tr>
    ))}
  </tbody>
</table>
```

## Troubleshooting

### "Not authorized" on login
- Check that user exists in Firebase Auth
- Verify `role: "admin"` is set in Firestore `users` collection
- Clear browser cache and try again

### No projects showing
- Check Firestore security rules allow admin read access
- Verify projects collection exists in Firestore
- Check browser console for errors

### CSV export not working
- Check browser allows downloads
- Verify filtered projects have data
- Check console for JavaScript errors

## Future Enhancements

Potential features to add:

- [ ] Bulk status updates
- [ ] Email notifications to customers
- [ ] Advanced analytics charts
- [ ] Custom report generation
- [ ] Project assignment to team members
- [ ] Document upload/management
- [ ] Real-time updates via Firestore listeners
- [ ] Activity logs and audit trail
- [ ] Customer communication portal
- [ ] Calendar integration for scheduling

## Support

For issues or questions:
1. Check Firebase Console logs
2. Review browser console errors
3. Verify Firestore security rules
4. Check authentication state

## License

This admin dashboard is part of the Power to the People VPP platform.
