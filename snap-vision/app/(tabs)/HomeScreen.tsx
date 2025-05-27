import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from './ThemeContext';

export default function HomeScreen() {
  const { isDark } = useTheme();

  // Theme-aware colors
  const background = isDark ? '#000000' : '#ffffff';
  const textPrimary = isDark ? '#69c6d0' : '#2f6e83';
  const border = isDark ? '#444' : '#ddd';
  const card = isDark ? '#1e1e1e' : '#f0f0f0';
  const qrText = isDark ? '#f7d85c' : '#333';
  const subText = isDark ? '#ccc' : '#666';

  return (
    <ScrollView style={[styles.container, { backgroundColor: background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: textPrimary }]}>GOING</Text>
        <Text style={[styles.title, { color: textPrimary }]}>SOMEWHERE?</Text>

        <TouchableOpacity style={styles.notification}>
          <Icon name="notifications-outline" size={24} color="#f7d85c" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.profile}>
          <FAIcon name="user-circle" size={28} color="#a6d2db" />
        </TouchableOpacity>
      </View>

      <View style={[styles.separator, { borderBottomColor: border }]} />

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.mapButton}>
          <Text style={styles.mapButtonText}>Go to maps</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.qrContainer, { backgroundColor: card }]}>
          <Icon name="camera-outline" size={20} color="#f7d85c" />
          <View style={{ marginLeft: 6 }}>
            <Text style={[styles.qrTitle, { color: qrText }]}>Scan a nearby QR code</Text>
            <Text style={[styles.qrSubtitle, { color: subText }]}>to enable offline mode</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={[styles.separator, { borderBottomColor: border }]} />

      <Text style={[styles.sectionTitle, { color: textPrimary }]}>Recently Visited</Text>
      <View style={styles.imageRow}>
        <Image source={require('../../assets/images/react-logo.png')} style={styles.image} />
        <Image source={require('../../assets/images/react-logo.png')} style={styles.image} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginTop: 100,
    alignItems: 'center',
    position: 'relative',
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    fontFamily: 'cursive',
  },
  notification: {
    position: 'absolute',
    top: -60,
    right: 50,
  },
  profile: {
    position: 'absolute',
    top: -60,
    right: 10,
  },
  separator: {
    marginTop: 20,
    borderBottomWidth: 1,
    marginVertical: 20,
    top: 60,
  },
  buttonRow: {
    top: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapButton: {
    backgroundColor: '#245f68',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 25,
  },
  mapButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  qrContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderColor: '#f7d85c',
    borderWidth: 1,
  },
  qrTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  qrSubtitle: {
    fontSize: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    top: 100,
  },
  imageRow: {
    top: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  image: {
    width: '48%',
    height: 150,
    borderRadius: 10,
  },
});
