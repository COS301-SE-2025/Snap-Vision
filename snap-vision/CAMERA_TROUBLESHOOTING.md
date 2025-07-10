# Camera Troubleshooting Guide

If you're seeing "No camera device found", try these solutions:

## Quick Fixes:

### 1. **Restart Metro and Rebuild**
```bash
cd "c:\Users\tisha\OneDrive\Desktop\Snap-Vision\snap-vision"
npx react-native start --reset-cache
```

In another terminal:
```bash
cd "c:\Users\tisha\OneDrive\Desktop\Snap-Vision\snap-vision"
npm run android
```

### 2. **Check Camera Permissions in Android Settings**
- Go to **Settings** > **Apps** > **Snap Vision** > **Permissions**
- Make sure **Camera** is enabled

### 3. **Clean Build**
```bash
cd "c:\Users\tisha\OneDrive\Desktop\Snap-Vision\snap-vision"
cd android
./gradlew clean
cd ..
npm run android
```

### 4. **Verify Camera Works in Other Apps**
- Open the default Camera app to ensure hardware is working
- Close all camera apps before testing AR

### 5. **Alternative: Use Fallback AR Mode**
The app now includes a fallback AR mode that works without camera:
- Shows direction arrow on black background
- Still provides navigation functionality
- Useful for testing and as backup

## Common Issues:

1. **Emulator**: Camera may not work properly in Android emulator
2. **Multiple Apps**: Close other camera apps before testing
3. **Permissions**: Make sure camera permission is granted in app settings
4. **Hardware**: Some devices may have camera access restrictions

## What the Fallback Mode Provides:

- ✅ Direction calculation still works
- ✅ Device heading updates
- ✅ Green arrow points to destination
- ✅ All AR logic functions correctly
- ✅ No camera dependency

The fallback mode proves that your AR navigation logic is working correctly!
