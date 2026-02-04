# iOS Capacitor Setup & App Store Compliance

## Quick Start

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/camera @capacitor/geolocation @capacitor/push-notifications
npx cap init "SteelBuild Pro" "com.yourcompany.steelbuildpro"
npm run build
npx cap add ios
npx cap sync
npx cap open ios
```

## 1. Info.plist Permission Strings (Required)

Add to `ios/App/App/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>SteelBuild Pro needs camera access to capture daily progress photos, document deliveries, and record site conditions.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Access photo library to attach existing photos to RFIs and documentation.</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>Location is used to track delivery arrivals and log site check-ins.</string>

<key>NSCalendarsUsageDescription</key>
<string>Sync project milestones and delivery schedules to your calendar.</string>

<key>NSUserNotificationsUsageDescription</key>
<string>Receive alerts for overdue RFIs, upcoming deliveries, and task assignments.</string>
```

## 2. App Store Connect Requirements

**Required URLs:**
- Privacy policy (must be live before submission)
- Support URL (contact page or email)

**Demo Account (Required for Review):**
```
Username: appstore_reviewer@demo.steelbuild.pro
Password: ReviewDemo2026
```
Pre-load with sample projects, RFIs, deliveries, tasks.

**Screenshots Required:**
- 6.7" iPhone (1290×2796) — min 3 screenshots
- 12.9" iPad (2048×2732) — min 3 screenshots

Show: Dashboard, RFI Hub, Deliveries, Schedule, Daily Logs

**App Icon:**
- 1024×1024px
- No transparency
- No rounded corners

## 3. Notes to Reviewer Template

```
SteelBuild Pro is a construction project management platform for steel fabrication companies.

DEMO ACCOUNT:
Username: appstore_reviewer@demo.steelbuild.pro
Password: ReviewDemo2026

KEY FEATURES TO TEST:
1. Dashboard → View project health and KPIs
2. RFI Hub → Create/update RFIs
3. Deliveries → View and mark deliveries received
4. Schedule → Gantt chart and task tracking
5. Daily Logs → Create log entry with photo (camera permission)

PERMISSIONS:
- Camera: Daily log photos (optional)
- Location: Delivery tracking (optional)
- Notifications: RFI alerts (optional)

All features work without permissions.

This is a B2B app requiring a SteelBuild Pro account.
```

## 4. Common Rejection Reasons

**4.2 Minimum Functionality** — App is just web wrapper
- ✅ Fix: Add Camera, Location, Push Notifications via Capacitor

**5.1.1 Privacy** — No privacy policy or incomplete
- ✅ Fix: Host privacy policy, link in App Store Connect

**2.1 Crashes** — App crashes during review
- ✅ Fix: Test on iOS 15+, fix all crashes before submission

**2.3 Metadata** — Screenshots don't match app
- ✅ Fix: Use actual app screens, not mockups

## 5. App Privacy Disclosures

**Data Collected:**
- Contact Info: Name, email (linked to user)
- Location: Precise location (linked to user, optional)
- Photos: User content (linked to projects)
- User Content: RFIs, logs, notes (linked to user)

**Usage:**
- App functionality (project management)
- Product personalization (user's projects)

**Not used for tracking or advertising.**

## 6. Implementation Timeline

- Days 1-2: Capacitor setup, Xcode config
- Day 3: App Store Connect, privacy policy
- Days 4-5: Metadata, screenshots
- Day 6: Demo account, review notes
- Day 7: Build and upload
- Days 8-10: TestFlight testing
- Day 11: Submit for review
- Days 12-14: Apple review (1-3 days average)

**Total: 10-14 days to live app**

## 7. Capacitor Plugin Usage

**Camera:**
```typescript
import { Camera, CameraResultType } from '@capacitor/camera';

const photo = await Camera.getPhoto({
  quality: 90,
  resultType: CameraResultType.Uri
});
```

**Location:**
```typescript
import { Geolocation } from '@capacitor/geolocation';

const position = await Geolocation.getCurrentPosition();
```

**Push Notifications:**
```typescript
import { PushNotifications } from '@capacitor/push-notifications';

await PushNotifications.requestPermissions();
await PushNotifications.register();
```

## 8. Before Submission Checklist

- [ ] Build succeeds in Xcode
- [ ] All permissions have usage descriptions
- [ ] Demo account works
- [ ] Privacy policy live
- [ ] Screenshots uploaded
- [ ] App icon set
- [ ] Review notes written
- [ ] TestFlight testing complete

## Resources

- Full setup guide: `components/shared/IOS_CAPACITOR_SETUP.md`
- Privacy policy template: `components/shared/PRIVACY_POLICY_TEMPLATE.md`
- Detailed checklist: `components/shared/APP_STORE_COMPLIANCE_CHECKLIST.md`
- Capacitor docs: https://capacitorjs.com/docs/ios
- App Store guidelines: https://developer.apple.com/app-store/review/guidelines/