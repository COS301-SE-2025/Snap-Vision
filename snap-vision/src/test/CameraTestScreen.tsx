// Simple camera test to debug camera device issues
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Camera, useCameraDevices, useCameraPermission } from 'react-native-vision-camera';

export default function CameraTestScreen() {
  const devices = useCameraDevices();
  const { hasPermission, requestPermission } = useCameraPermission();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    console.log('=== CAMERA DEBUG INFO ===');
    console.log('Has permission:', hasPermission);
    console.log('Available devices:', devices);
    console.log('Device keys:', Object.keys(devices));
    console.log('Back camera:', devices.back);
    console.log('Front camera:', devices.front);
    console.log('========================');
  }, [devices, hasPermission]);

  const handleStartCamera = async () => {
    if (!hasPermission) {
      const permission = await requestPermission();
      if (permission) {
        setIsActive(true);
      }
    } else {
      setIsActive(true);
    }
  };

  const selectedDevice = devices.back || devices.front || Object.values(devices)[0];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Camera Device Test</Text>

      <View style={styles.info}>
        <Text>Permission: {hasPermission ? '✅ Granted' : '❌ Not granted'}</Text>
        <Text>Available devices: {Object.keys(devices).length}</Text>
        <Text>Device types: {Object.keys(devices).join(', ')}</Text>
        <Text>Selected device: {selectedDevice ? '✅ Found' : '❌ None'}</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleStartCamera}>
        <Text style={styles.buttonText}>Test Camera</Text>
      </TouchableOpacity>

      {isActive && selectedDevice && (
        <View style={styles.cameraContainer}>
          <Camera
            style={styles.camera}
            device={selectedDevice}
            isActive={true}
            photo={false}
            video={false}
          />
          <Text style={styles.successText}>✅ Camera is working!</Text>
        </View>
      )}

      {isActive && !selectedDevice && (
        <Text style={styles.errorText}>❌ No camera device available</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  info: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
    borderRadius: 8,
  },
  successText: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    textAlign: 'center',
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 255, 0, 0.7)',
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    textAlign: 'center',
    color: 'red',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
  },
});
