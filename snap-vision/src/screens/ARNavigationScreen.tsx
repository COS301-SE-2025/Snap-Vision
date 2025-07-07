import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, PermissionsAndroid } from 'react-native';
import { ViroARScene, ViroText, ViroARSceneNavigator, ViroBox, ViroAmbientLight } from '@viro-community/react-viro';

interface Props {
  route: {
    params: {
      destination: string;
      coordinates: [number, number];
      steps: Array<{ instruction: string; distance: number }>;
    };
  };
}

const ARNavigationScreen = ({ route }: Props) => {
  const { destination, coordinates, steps } = route.params;
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'AR navigation needs camera access to show directions',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
    } catch (err) {
      console.warn(err);
    }
  };

  const ARScene = () => {
    return (
      <ViroARScene>
        <ViroAmbientLight color="#ffffff" intensity={200} />
        
        {/* Direction Arrow */}
        <ViroBox
          position={[0, 0, -2]}
          scale={[0.3, 0.1, 0.1]}
          materials={["arrow"]}
          animation={{
            name: "pulse",
            run: true,
            loop: true,
          }}
        />
        
        {/* Direction Text */}
        <ViroText
          text={steps[0]?.instruction || `Navigate to ${destination}`}
          scale={[0.5, 0.5, 0.5]}
          position={[0, 1, -2]}
          style={styles.arText}
        />
        
        {/* Distance Text */}
        <ViroText
          text={`${steps[0]?.distance || 0}m ahead`}
          scale={[0.3, 0.3, 0.3]}
          position={[0, 0.5, -2]}
          style={styles.arDistance}
        />
      </ViroARScene>
    );
  };

  if (!hasPermission) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <ViroARSceneNavigator
        autofocus={true}
        initialScene={{
          scene: ARScene,
        }}
        style={styles.arView}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  arView: {
    flex: 1,
  },
  arText: {
    fontFamily: 'Arial',
    fontSize: 20,
    color: '#ffffff',
    textAlignVertical: 'center',
    textAlign: 'center',
  },
  arDistance: {
    fontFamily: 'Arial',
    fontSize: 16,
    color: '#00ff00',
    textAlignVertical: 'center',
    textAlign: 'center',
  },
});

export default ARNavigationScreen;