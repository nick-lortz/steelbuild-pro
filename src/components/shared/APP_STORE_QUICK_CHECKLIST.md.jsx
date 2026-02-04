# App Store Submission — Quick Checklist

## Before You Start
- [ ] Apple Developer Program membership ($99/year)
- [ ] Xcode installed (latest version)
- [ ] Apple Developer account configured in Xcode

## Technical Setup (Days 1-2)
- [ ] Install Capacitor: `npm install @capacitor/core @capacitor/cli @capacitor/ios`
- [ ] Initialize: `npx cap init "SteelBuild Pro" "com.yourcompany.steelbuildpro"`
- [ ] Add iOS: `npx cap add ios`
- [ ] Open Xcode: `npx cap open ios`
- [ ] Set bundle ID, version (1.0.0), build (1)
- [ ] Add app icon (1024×1024, no transparency)
- [ ] Configure signing (select your team)

## Permission Strings (Required)
Add to `ios/App/App/Info.plist`:
- [ ] `NSCameraUsageDescription` — "Capture daily progress photos and site documentation"
- [ ] `NSPhotoLibraryUsageDescription` — "Attach existing photos to RFIs"
- [ ] `NSLocationWhenInUseUsageDescription` — "Track delivery arrivals and site check-ins"
- [ ] `NSCalendarsUsageDescription` — "Sync project milestones to calendar"
- [ ] `NSUserNotificationsUsageDescription` — "Alerts for RFIs and deliveries"

## App Store Connect (Day 3)
- [ ] Create app record
- [ ] App name: "SteelBuild Pro"
- [ ] Bundle ID: matches Xcode
- [ ] Category: Business / Productivity
- [ ] Privacy policy URL (must be live)
- [ ] Support URL

## Metadata (Days 4-5)
- [ ] Description (highlights key features, mentions account requirement)
- [ ] Keywords: construction, steel, RFI, delivery, schedule, budget (max 100 chars)
- [ ] Screenshots (6.7" iPhone and 12.9" iPad, min 3 each)
- [ ] App icon uploaded (1024×1024)

## Demo Account (Day 6)
- [ ] Create: `appstore_reviewer@demo.steelbuild.pro`
- [ ] Password: Strong, memorable
- [ ] Pre-load sample data (projects, RFIs, deliveries, tasks)
- [ ] Test login works

## Review Notes (Day 6)
```
SteelBuild Pro is construction project management for steel teams.

DEMO ACCOUNT:
Username: appstore_reviewer@demo.steelbuild.pro
Password: [your password]

TEST:
1. Dashboard → Project health/KPIs
2. RFI Hub → Create/update RFIs
3. Deliveries → Mark received
4. Schedule → Gantt view
5. Daily Logs → Add photo (camera permission)

PERMISSIONS: Camera, location, notifications (all optional).
```

## Build & Upload (Day 7)
- [ ] Clean build: Cmd+Shift+K
- [ ] Archive: Product → Archive
- [ ] Validate archive
- [ ] Upload to App Store Connect
- [ ] Wait for processing (10-60 min)

## TestFlight (Days 8-10)
- [ ] Enable TestFlight
- [ ] Add internal testers
- [ ] Test on iOS 15, 16, 17
- [ ] Test iPhone and iPad
- [ ] Fix any crashes or bugs

## Submit (Day 11)
- [ ] Select build in App Store Connect
- [ ] Complete App Privacy section
- [ ] Review all metadata
- [ ] Submit for review

## After Submission
- [ ] Monitor email for review status
- [ ] Respond to questions within 24 hours
- [ ] If rejected, fix issues and resubmit
- [ ] App goes live in 1-3 days (average)

## Common Rejections

**4.2 Minimum Functionality** (web wrapper)
→ Add Camera, Location, Push via Capacitor

**5.1.1 Privacy** (no policy)
→ Host privacy policy, link in App Store Connect

**2.1 Crashes**
→ Test on older devices, fix all crashes

**2.3 Metadata** (screenshots don't match)
→ Use actual app screens, not mockups

## App Privacy Disclosures

**Data Collected:**
- Contact Info: Name, email
- Location: GPS (optional)
- Photos: User content (optional)
- User Content: RFIs, logs

**Usage:**
- App functionality only
- No tracking or advertising

## Resources

- Capacitor docs: https://capacitorjs.com/docs/ios
- App Store guidelines: https://developer.apple.com/app-store/review/guidelines/
- Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/

## Timeline

**Total: 10-14 days**
- Setup: 2 days
- Metadata: 3 days
- Build/Upload: 1 day
- TestFlight: 3 days
- Apple review: 1-3 days

**Questions?** See full guides in `components/shared/