# Drama Llama AI - Mobile App Setup Guide

This guide will help you get the React Native version of Drama Llama AI ready for Google Play Store deployment.

## Quick Start (This Weekend)

### Prerequisites
1. **Node.js 18+** - Download from [nodejs.org](https://nodejs.org/)
2. **Expo CLI** - Install globally: `npm install -g @expo/cli`
3. **EAS CLI** - Install globally: `npm install -g eas-cli`
4. **Android Studio** (for testing) - Download from [developer.android.com](https://developer.android.com/studio)

### Step 1: Initial Setup
```bash
cd mobile
npm install
```

### Step 2: Configure Your Backend URL
Edit `src/services/api.tsx` and update the API_BASE_URL:
```typescript
const API_BASE_URL = 'https://your-actual-domain.com';
```

### Step 3: Create Expo Account & Project
```bash
# Login to Expo
eas login

# Initialize EAS project
eas build:configure
```

### Step 4: Test on Device
```bash
# Start development server
npm start

# Scan QR code with Expo Go app on your phone
```

### Step 5: Build for Android
```bash
# Create production build
eas build --platform android --profile production
```

## Google Play Store Deployment

### Prerequisites for Play Store
1. **Google Play Developer Account** ($25 one-time fee)
2. **App Signing** - EAS handles this automatically
3. **Privacy Policy** - Required for apps handling user data
4. **App Store Assets** - Icons, screenshots, descriptions

### Build Configuration
The `eas.json` file is already configured for:
- **Development builds** for testing
- **Preview builds** for APK testing
- **Production builds** for Play Store (AAB format)

### App Store Assets Needed
1. **App Icon** (512x512px)
2. **Feature Graphic** (1024x500px)
3. **Screenshots** (phone and tablet sizes)
4. **App Description** (short and full)
5. **Privacy Policy URL**

### Deployment Steps
1. Build production AAB: `eas build --platform android --profile production`
2. Download the `.aab` file from Expo dashboard
3. Upload to Google Play Console
4. Fill in store listing details
5. Submit for review

## Key Features Included

### Authentication
- Secure login/register with token storage
- Session management with auto-refresh
- Secure storage using Expo SecureStore

### Chat Analysis
- Text input for chat conversations
- Image upload for screenshot analysis
- Real-time analysis results display
- Comprehensive tone and relationship insights

### Script Builder
- Situation-based script generation
- Multiple communication styles (Firm, Neutral, Empathic)
- Save/load scripts functionality
- Copy-to-clipboard for easy use

### User Profile
- Usage tracking and limits
- Tier-based feature access
- Account management
- Settings and preferences

## Project Structure
```
mobile/
├── src/
│   ├── contexts/          # Authentication and API contexts
│   ├── screens/           # All app screens
│   ├── services/          # API service layer
│   └── components/        # Reusable components (when needed)
├── assets/               # App icons, splash screens
├── app.json             # Expo configuration
├── eas.json             # Build configuration
└── package.json         # Dependencies
```

## Backend Integration
The mobile app connects to your existing Drama Llama backend:
- **Authentication**: `/api/auth/login`, `/api/auth/register`
- **Chat Analysis**: `/api/chat/analyze`, `/api/chat/analyze-image`
- **Script Builder**: `/api/script-builder`
- **User Data**: `/api/user/usage`, `/api/scripts`

## Testing Strategy
1. **Development**: Use Expo Go for rapid testing
2. **Preview**: Build APK for detailed testing
3. **Production**: Build AAB for Play Store submission

## Timeline for This Weekend
**Friday**: Complete setup and initial testing
**Saturday**: Build production version and prepare store assets
**Sunday**: Submit to Google Play Store

## Next Steps After Deployment
1. **Over-the-Air Updates**: Push updates instantly without app store review
2. **Analytics**: Add crash reporting and user analytics
3. **Push Notifications**: Implement user engagement features
4. **Performance**: Optimize based on user feedback

## Troubleshooting

### Common Issues
- **Build fails**: Check all dependencies in package.json
- **API connection**: Verify backend URL is accessible
- **Authentication**: Ensure secure storage permissions

### Support Resources
- **Expo Documentation**: [docs.expo.dev](https://docs.expo.dev)
- **React Native Guide**: [reactnative.dev](https://reactnative.dev)
- **Google Play Console**: [play.google.com/console](https://play.google.com/console)

## Important Notes
- The app uses your existing backend API
- All user data flows through your current database
- Authentication tokens are stored securely on device
- Images are uploaded to your existing image analysis endpoint

Your mobile app is now ready for Google Play Store deployment with all the core Drama Llama AI features!