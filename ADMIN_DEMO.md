# Admin Dashboard Demo

## Quick Start

### 1. Create Test Admin User

**Manual Method (5 minutes):**

1. Go to [Firebase Console](https://console.firebase.google.com/project/agentic-labs/authentication/users)

2. Click "Add user"
   - Email: `test@admin.com`
   - Password: `Test123456!`
   - Click "Add user"

3. Copy the UID (looks like: `AbCdEfGh1234567890`)

4. Go to [Firestore](https://console.firebase.google.com/project/agentic-labs/firestore)

5. Click on `users` collection (create if doesn't exist)

6. Click "Add document"
   - Document ID: Paste the UID
   - Fields:
     ```
     email: "test@admin.com"
     displayName: "Test Admin"
     role: "admin"
     createdAt: [click timestamp icon]
     ```

7. Click "Save"

### 2. Start Development Server

```bash
cd ~/Projects/power-to-the-people
npm run dev
```

### 3. Access Admin Dashboard

1. Open browser: `http://localhost:5173/admin`

2. Login with:
   - Email: `test@admin.com`
   - Password: `Test123456!`

## Dashboard Overview

### Main Features

#### 📊 **Statistics Cards**
- **Total Projects**: Shows count of all customer applications
- **Active Customers**: Number of unique customers
- **Total Capacity**: Sum of all system sizes in kW
- **Revenue (Est.)**: Estimated VPP program value

#### 🔍 **Search & Filter**
- **Search Box**: Type to search across:
  - Project IDs (e.g., "PTTP-1234")
  - Customer names (e.g., "John Smith")
  - Email addresses
  - Physical addresses

- **Status Filter**: Dropdown with options:
  - All Status (default)
  - Submitted
  - Reviewing
  - Approved
  - Scheduled
  - Completed
  - Cancelled

#### 📋 **Projects Table**
Displays all projects with:
- **Project ID**: Unique identifier
- **Customer**: Name and contact info
- **Address**: Full installation address
- **Status**: Color-coded badge
- **System Size**: Solar + battery capacity
- **Created**: Submission date
- **Actions**: View button → project details

#### 🔄 **Actions**
- **Refresh**: Reload data from Firestore
- **Export**: Download filtered projects as CSV

## Testing the Dashboard

### Test Scenarios

#### 1. View Dashboard with Mock Data
- If no real projects exist, the system shows mock data
- 12 sample projects with various statuses
- Statistics calculated from mock data

#### 2. Search Functionality
```
Try searching:
- "john" → finds John Smith
- "austin" → finds all Austin addresses
- "submitted" → finds projects with that status
- "PTTP" → finds all project IDs
```

#### 3. Filter by Status
```
1. Select "Approved" → shows only approved projects
2. Select "Completed" → shows finished installations
3. Select "All Status" → shows everything
```

#### 4. Export to CSV
```
1. Set desired filters
2. Click "Export" button
3. Check Downloads folder for CSV file
4. Open in Excel/Numbers/Google Sheets
```

#### 5. View Project Details
```
1. Click "View" button on any project
2. Redirects to project status page
3. Shows full customer details
```

## Creating Test Projects

To test with real data, create sample projects:

### Method 1: Use the Qualification Form

1. Navigate to `http://localhost:5173/qualify`
2. Fill out the form with test data:
   ```
   Name: John Test
   Email: john@test.com
   Phone: 512-555-0123
   Address: 123 Test St, Austin, TX 78701
   ```
3. Submit the form
4. Check admin dashboard for new project

### Method 2: Add Directly to Firestore

1. Go to Firestore Console
2. Navigate to `projects` collection
3. Click "Add document"
4. Add fields:
   ```
   id: "PTTP-1234567890"
   customerName: "Jane Doe"
   email: "jane@example.com"
   phone: "512-555-0100"
   address: "456 Main St, Austin, TX 78701"
   status: "submitted"
   systemSize: 8.5
   batterySize: 15.0
   createdAt: [timestamp]
   ```

## Dashboard Screenshots

### Login Screen
```
┌─────────────────────────────────┐
│     [⚡]                        │
│   Admin Dashboard               │
│   Power to the People Management│
│                                 │
│   Email: ___________________    │
│   Password: ________________    │
│                                 │
│   [      Sign In      ]        │
│                                 │
│   ← Back to Home               │
└─────────────────────────────────┘
```

### Main Dashboard
```
┌──────────────────────────────────────────────────┐
│ ⚡ Admin Dashboard          Test Admin ▼ Logout │
├──────────────────────────────────────────────────┤
│                                                  │
│ Dashboard                                        │
│ Manage customer projects and track performance  │
│                                                  │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐│
│ │  TOTAL   │ │  ACTIVE  │ │  TOTAL   │ │REVENUE││
│ │ PROJECTS │ │CUSTOMERS │ │ CAPACITY │ │(EST.) ││
│ │    12    │ │    10    │ │  84.5 kW │ │$42,250││
│ │+4 this mo│ │ 25% growth│ │Installed │ │  VPP  ││
│ └──────────┘ └──────────┘ └──────────┘ └──────┘│
│                                                  │
│ ┌──────────────────────────────────────────────┐│
│ │ All Projects                                 ││
│ │                                              ││
│ │ [🔍 Search...] [Status ▼] [🔄] [⬇ Export] ││
│ │                                              ││
│ │ ID       | Customer | Address | Status | ... ││
│ │──────────┼──────────┼─────────┼────────┼────││
│ │ PTTP-123 | John S.  | Austin  | ✓ Appr...  ││
│ │ PTTP-456 | Sarah J. | Dallas  | ⏱ Review...││
│ │ ...                                          ││
│ └──────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

## Troubleshooting

### Can't Login?
```bash
# Check user exists
# Firebase Console > Authentication > Users
# Verify email: test@admin.com is listed

# Check role is set
# Firestore > users > [UID] > role: "admin"
```

### No Projects Showing?
```bash
# In development, mock data should show automatically
# If not, check browser console for errors

# Check Firestore connection
# Look for: "Admin: Loaded X projects"
```

### Build Errors?
```bash
# Reinstall dependencies
npm install

# Clear cache and rebuild
rm -rf node_modules/.vite
npm run dev
```

## Next Steps

After testing the admin dashboard:

1. **Deploy to Production**
   ```bash
   npm run build
   firebase deploy
   ```

2. **Configure Real Admin Users**
   - Remove test accounts
   - Create production admin accounts
   - Use strong passwords
   - Enable 2FA

3. **Set Up Firestore Security Rules**
   - See ADMIN_SETUP.md for rules
   - Test rules with Firebase emulator

4. **Add Custom Features**
   - Bulk operations
   - Email notifications
   - Advanced analytics
   - Report generation

## Demo Video Walkthrough

*To create a demo video:*

1. Record screen: QuickTime > File > New Screen Recording
2. Show login process
3. Navigate dashboard features
4. Demonstrate search/filter
5. Export CSV
6. View project details
7. Logout

## Support & Documentation

- Setup Guide: `ADMIN_SETUP.md`
- Main README: `README.md`
- Firebase Docs: https://firebase.google.com/docs
- React Router: https://reactrouter.com/

## Security Reminder

🔒 **IMPORTANT:** Never commit admin credentials to git!

- Use environment variables for production
- Store credentials in Firebase Console
- Enable 2FA for all admin accounts
- Regularly audit admin access logs
