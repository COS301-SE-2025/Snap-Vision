# AR Navigation Setup Guide

This guide will help you complete the AR navigation setup for Snap Vision.

## Current Status ✅

The following components have been implemented:

1. **AR Navigation Hook** - `src/hooks/useCompass.ts`
2. **AR Navigation Overlay** - `src/components/organisms/ARNavigationOverlay.tsx` (placeholder version)
3. **AR Utilities** - Added to `src/utils/navigationUtils.ts`
4. **Camera Permissions** - `src/utils/cameraPermissions.ts`
5. **MapScreen Integration** - AR toggle button and overlay integration
6. **Android Permissions** - Camera permission added to AndroidManifest.xml

## Dependencies Installed 📦

- react-native-vision-camera
- @shopify/react-native-skia
- react-native-worklets-core
- react-native-sensors

## Next Steps for Full AR Implementation 🚀

### 1. Android Configuration

Add to `android/app/build.gradle`:

```gradle
android {
  ...
  packagingOptions {
    pickFirst "**/*.so"
  }
}
```

### 2. iOS Setup (when iOS folder is available)

Add to `ios/YourApp/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>This app needs camera access for AR navigation</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app needs location access for navigation</string>
```

### 3. React Native Vision Camera Setup

Run the following commands:

```bash
cd android && ./gradlew clean && cd ..
npx react-native run-android
```

### 4. Enable Full AR Implementation

Once all dependencies are working, replace the import in `MapScreen.tsx`:

```typescript
// Replace this line:
import ARNavigationOverlay from '../components/organisms/ARNavigationOverlay';

// With this line:
import ARNavigationOverlay from '../components/organisms/ARNavigationOverlay.advanced';
```

### 5. Test AR Functionality

1. Start navigation to any destination
2. Tap the AR button (appears during navigation)
3. Grant camera permission when prompted
4. See AR directional arrow overlay on camera feed

## Current AR Features 🎯

- **Direction Arrow**: Points toward destination
- **Device Heading**: Uses magnetometer for device orientation
- **Permission Handling**: Automatic camera permission requests
- **Navigation Integration**: Only available during active navigation
- **Coordinate Transformation**: Converts between different coordinate systems

## Troubleshooting 🔧

### Camera Not Working

1. Check camera permissions in device settings
2. Restart the app after granting permissions
3. Ensure no other apps are using the camera

### AR Button Not Showing

- AR button only appears when navigation is active
- Make sure you have a destination set and navigation started

### Direction Arrow Not Accurate

- Calibrate device compass by moving in figure-8 pattern
- Ensure location permissions are granted
- Check that GPS signal is strong

## Coordinate System Notes 📍

The AR system currently uses:

- **Current Location**: Longitude/Latitude from GPS
- **Destination Coords**: Your indoor coordinate system (x, y)
- **Bearing Calculation**: Converts between coordinate systems

You may need to adjust the coordinate transformation in `calculateBearingFromCoords()` function based on your specific indoor mapping coordinate system.

## Future Enhancements 🔮

Potential improvements for the AR system:

1. **3D Arrow Rendering**: More sophisticated arrow graphics
2. **Distance Display**: Show distance to destination in AR view
3. **Waypoint Indicators**: Show intermediate waypoints
4. **Landmark Recognition**: Integrate with room/building recognition
5. **AR Compass**: Show cardinal directions
6. **Turn Prediction**: Show upcoming turns in AR view

## Files Modified/Created 📁

- `src/hooks/useCompass.ts` (new)
- `src/components/organisms/ARNavigationOverlay.tsx` (new)
- `src/components/organisms/ARNavigationOverlay.advanced.tsx` (new)
- `src/utils/cameraPermissions.ts` (new)
- `src/utils/navigationUtils.ts` (updated with AR utilities)
- `src/screens/MapScreen.tsx` (updated with AR integration)
- `android/app/src/main/AndroidManifest.xml` (updated with camera permission)
