# Firebase Setup Guide

This application now uses Firebase Firestore for real-time data synchronization across devices. Follow these steps to set up Firebase:

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard
4. Enable Firestore Database:
   - Go to "Firestore Database" in the left sidebar
   - Click "Create database"
   - Start in **test mode** (we'll update security rules)
   - Choose a location for your database

## 2. Get Firebase Configuration

1. In Firebase Console, go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click the web icon (`</>`) to add a web app
4. Register your app and copy the configuration values

## 3. Set Up Environment Variables

1. Copy `.env.example` to `.env` in the `client` folder:
   ```bash
   cd client
   cp .env.example .env
   ```

2. Update `.env` with your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your-api-key-here
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=your-app-id
   ```

## 4. Set Up Firestore Security Rules

1. In Firebase Console, go to "Firestore Database" > "Rules"
2. Replace the default rules with the provided security rules:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // This rule allows anyone with your Firestore database reference to view, edit,
    // and delete all data in your Firestore database. It is useful for getting
    // started, but it is configured to expire after 30 days because it
    // leaves your app open to attackers. At that time, all client
    // requests to your Firestore database will be denied.
    //
    // Make sure to write security rules for your app before that time, or else
    // all client requests to your Firestore database will be denied until you Update
    // your rules
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2026, 1, 19);
    }
  }
}
```

**Important:** These are temporary rules that expire on January 19, 2026. Before that date, you should implement proper security rules based on user authentication and roles.

## 5. Firestore Collections Structure

The application uses the following collections:

- **users**: User accounts and profiles
- **rooms**: Chat rooms and group conversations
- **messages**: Chat messages
- **files**: File metadata
- **events**: Calendar events and meetings
- **notifications**: User notifications
- **auditLogs**: Security audit logs
- **accessRules**: Access control rules
- **recentActivity**: Recent user activity

## 6. Features Enabled

With Firestore integration, the following features now work in real-time across devices:

✅ **Real-time Chat**: Messages sync instantly across all devices
✅ **User Management**: Admins can see and manage users in real-time
✅ **User Presence**: See who's online/offline
✅ **Rooms**: Room updates sync across devices
✅ **Files**: File metadata syncs in real-time
✅ **Calendar Events**: Events sync across devices
✅ **Notifications**: Real-time notifications

## 7. Testing

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open the app in multiple browser windows or devices
3. Create a user in one window
4. The user should appear in the admin panel in another window
5. Send a message in one window - it should appear in real-time in other windows

## 8. Troubleshooting

### "Firebase: Error (auth/configuration-not-found)"
- Make sure your `.env` file exists and has all required variables
- Restart the development server after updating `.env`

### "Permission denied" errors
- Check your Firestore security rules
- Make sure the rules allow read/write access

### Data not syncing
- Check browser console for errors
- Verify Firebase configuration is correct
- Check Firestore console to see if data is being written

## 9. Production Considerations

Before deploying to production:

1. **Update Security Rules**: Implement proper authentication-based rules
2. **Enable Authentication**: Consider using Firebase Authentication
3. **Set up Indexes**: Create composite indexes for complex queries
4. **Monitor Usage**: Set up billing alerts in Firebase Console
5. **Backup Strategy**: Set up regular Firestore backups

## 10. Next Steps

- [ ] Implement Firebase Authentication for secure user login
- [ ] Add proper security rules based on user roles
- [ ] Set up Firestore indexes for better query performance
- [ ] Implement offline persistence for better UX
- [ ] Add data validation rules

