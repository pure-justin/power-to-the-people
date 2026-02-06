# Admin Dashboard - Power to the People

## Overview

The Admin Dashboard is a fully-featured administrative interface for managing customer projects, tracking performance metrics, and overseeing the Power to the People solar enrollment platform.

## Access

**URL:** `http://localhost:5174/admin` (or `/admin` on production)

**Authentication:** Email/password authentication with admin role verification

## Features Implemented

### ✅ Authentication System
- **Email/Password Login**: Secure authentication using Firebase Auth
- **Role-Based Access Control**: Only users with `role: "admin"` in Firestore can access
- **Auto-Redirect**: Non-admin users are automatically signed out and redirected
- **Session Management**: Persistent login with Firebase Auth state management

### ✅ Dashboard Statistics
Real-time metrics displayed in card format:
- **Total Projects**: Count of all projects with monthly growth indicator
- **Active Customers**: Unique customers with non-cancelled projects
- **Total Capacity**: Sum of all installed system sizes (kW)
- **Estimated Revenue**: Calculated revenue based on system sizes

### ✅ Project Management
- **Project Table**: Complete list of all customer projects
- **Real-time Search**: Filter by project ID, customer name, email, address
- **Status Filtering**: Filter by status (submitted, reviewing, approved, scheduled, completed, cancelled)
- **Project Details**: View full project information with one click
- **Sorting**: Projects ordered by creation date (newest first)

### ✅ Advanced Features
- **Export to CSV**: Download filtered project data as CSV file
- **Refresh Button**: Manually refresh dashboard data with loading animation
- **Responsive Design**: Mobile-friendly layout that adapts to screen sizes
- **Empty States**: User-friendly messaging when no projects match filters
- **Status Badges**: Color-coded status indicators with icons

## File Structure

```
src/
├── pages/
│   └── Admin.jsx              # Main admin dashboard component
├── services/
│   ├── adminService.js        # Admin-specific Firestore queries
│   └── firebase.js            # Firebase configuration and auth
└── App.jsx                    # Route configuration
scripts/
└── create-admin.js            # Script to create admin users
```

## Creating Admin Users

### Option 1: Using the Script (Requires Firebase Admin SDK)

```bash
node scripts/create-admin.js admin@example.com SecurePassword123 "Admin User"
```

**Requirements:**
- Download service account key from Firebase Console
- Save as `agentic-labs-firebase-admin.json` in project root

### Option 2: Manual Setup (Recommended for Development)

1. **Firebase Console > Authentication > Users**
   - Click "Add user"
   - Email: `admin@example.com`
   - Password: Your secure password
   - Copy the generated UID

2. **Firebase Console > Firestore > users collection**
   - Click "Add document"
   - Document ID: [paste the UID from step 1]
   - Add fields:
     ```
     email: "admin@example.com"
     displayName: "Admin User"
     role: "admin"
     createdAt: [current timestamp]
     ```

3. **Login**
   - Navigate to `http://localhost:5174/admin`
   - Use the credentials created above

## API Functions (adminService.js)

### `getAdminProjects()`
Fetches all projects ordered by creation date (newest first)

```javascript
const projects = await getAdminProjects();
```

### `getAdminStats()`
Calculates dashboard statistics from project data

```javascript
const stats = await getAdminStats();
// Returns: { totalProjects, newThisMonth, activeCustomers, customerGrowth, totalCapacity, estimatedRevenue }
```

### `updateProjectStatus(projectId, newStatus)`
Updates project status (for future enhancements)

```javascript
await updateProjectStatus('PTTP-123456', 'approved');
```

### `getProjectsByStatus(status)`
Filters projects by specific status

```javascript
const approvedProjects = await getProjectsByStatus('approved');
```

### `searchProjects(searchTerm)`
Client-side search across project fields

```javascript
const results = await searchProjects('john@example.com');
```

## Status Types

| Status | Color | Description |
|--------|-------|-------------|
| `submitted` | Blue | Initial application submitted |
| `reviewing` | Orange | Under review by admin |
| `approved` | Green | Approved for installation |
| `scheduled` | Purple | Installation scheduled |
| `completed` | Dark Green | Installation complete |
| `cancelled` | Red | Project cancelled |

## Security Features

1. **Role-Based Access**: Only `role: "admin"` users can access
2. **Auto-Logout**: Non-admin users are immediately signed out
3. **Secure Queries**: Firestore security rules enforce data access
4. **Session Validation**: Auth state checked on every page load

## Mock Data

For development without real projects, the system includes mock data:
- 12 sample projects
- Realistic customer names and addresses
- Random statuses and system sizes
- Mock data is used when Firestore queries fail in development mode

## Styling

The admin dashboard uses inline styles and follows the existing design system:
- **Colors**: Matches Power to the People brand (green primary, dark secondary)
- **Typography**: Inter font family throughout
- **Components**: Clean, modern card-based design
- **Icons**: Lucide React icons for consistency
- **Animations**: Smooth transitions and hover effects

## Testing the Dashboard

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Create an admin user** (see "Creating Admin Users" above)

3. **Navigate to:**
   ```
   http://localhost:5174/admin
   ```

4. **Login with admin credentials**

5. **Test features:**
   - View statistics cards
   - Search for projects
   - Filter by status
   - Export to CSV
   - Refresh data
   - Click "View" to see project details

## Future Enhancements

### Potential Features to Add:
- [ ] Bulk status updates
- [ ] Project notes/comments
- [ ] Email notifications to customers
- [ ] Advanced analytics charts
- [ ] User management (create/edit/delete users)
- [ ] Activity logs
- [ ] Project timeline view
- [ ] Document management
- [ ] Direct messaging with customers
- [ ] Calendar view for scheduled installations
- [ ] Revenue forecasting
- [ ] Customer satisfaction ratings

## Troubleshooting

### "Not authorized" error
- Ensure user has `role: "admin"` in Firestore users collection
- Check Firebase Console > Firestore > users > [your UID]

### Empty project list
- Check Firestore security rules allow admin reads
- Verify projects exist in Firestore
- In development, mock data should appear automatically

### Login fails
- Verify email/password are correct
- Check Firebase Console > Authentication for user status
- Ensure Firebase config is correct in `firebase.js`

### Can't access /admin route
- Verify route exists in `App.jsx`
- Check that dev server is running
- Clear browser cache and try again

## Performance Considerations

- **Initial Load**: ~500ms with Firestore queries
- **Search**: Client-side filtering is instant
- **Export**: Processes filtered data only
- **Refresh**: Re-fetches all data from Firestore

For large datasets (1000+ projects), consider:
- Pagination
- Server-side search (Algolia/Elasticsearch)
- Data caching
- Lazy loading

## Support

For issues or questions:
1. Check this documentation
2. Review Firebase Console logs
3. Check browser developer console for errors
4. Verify Firestore security rules
