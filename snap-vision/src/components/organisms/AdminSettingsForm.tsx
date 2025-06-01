import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import Toggle from '../atoms/Toggle';
import SettingItem from '../molecules/SettingItem';
import ThemedText from '../atoms/ThemedText';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

const SectionHeader = ({ title }: { title: string }) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  
  return (
    <View style={styles.sectionHeaderContainer}>
      <ThemedText size="lg" weight="bold" style={{ color: colors.primary }}>
        {title}
      </ThemedText>
    </View>
  );
};

const Divider = () => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  
  return <View style={[styles.divider, { backgroundColor: colors.secondary }]} />;
};

const AdminSettingsForm = () => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  
  const [enable2FA, setEnable2FA] = useState(false);
  const [sessionTimeout] = useState('15 minutes');
  const [defaultViewMode] = useState('AR');
  const [accessibilityRoutes, setAccessibilityRoutes] = useState(true);
  const [useQRFallback, setUseQRFallback] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [mapZoom] = useState('Auto');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [notifyFloorplan, setNotifyFloorplan] = useState(true);

  const resetToDefaults = () => {
    setEnable2FA(false);
    setAccessibilityRoutes(true);
    setUseQRFallback(true);
    setShowOnboarding(true);
    setEmailAlerts(true);
    setNotifyFloorplan(true);
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
       <ThemedText size="xl" weight="bold" style={[styles.mainHeader, { color: colors.primary }]}>
        App Settings
      </ThemedText>
      
      {/* Security Settings */}
      <SectionHeader title="Security Settings" />
      <SettingItem
        title="Enable 2FA for admins"
        titleStyle={{ color: colors.primary }}
        description="Two-factor authentication enhances security."
        descriptionStyle={{ color: colors.secondary }}
        rightComponent={<Toggle value={enable2FA} onValueChange={setEnable2FA} />}
      />
      <Divider />
      <SettingItem
        title="Session timeout duration"
        titleStyle={{ color: colors.primary }}
        rightComponent={
          <View style={styles.timeoutContainer}>
            <ThemedText style={{ color: colors.secondary }}>{sessionTimeout}</ThemedText>
          </View>
        }
      />
      <Divider />

      {/* Navigation Settings */}
      <SectionHeader title="Navigation Settings" />
      <SettingItem
        title="Default view mode"
        titleStyle={{ color: colors.primary }}
        description="Choose between 2D map or AR"
        descriptionStyle={{ color: colors.secondary }}
        rightComponent={
          <View style={styles.timeoutContainer}>
            <ThemedText style={{ color: colors.secondary }}>{defaultViewMode}</ThemedText>
          </View>
        }
      />
      <Divider />
      <SettingItem
        title="Enable accessibility routes"
        titleStyle={{ color: colors.primary }}
        rightComponent={<Toggle value={accessibilityRoutes} onValueChange={setAccessibilityRoutes} />}
      />
      <Divider />
     

      {/* Positioning Settings */}
      <SectionHeader title="Positioning Settings" />
      <SettingItem
        title="Use QR fallback"
        titleStyle={{ color: colors.primary }}
        rightComponent={<Toggle value={useQRFallback} onValueChange={setUseQRFallback} />}
      />
      <Divider />
      <SettingItem
        title="Beacon sync interval"
        titleStyle={{ color: colors.primary }}
        description="Advanced setting"
        descriptionStyle={{ color: colors.secondary }}
        rightComponent={
          <View style={styles.timeoutContainer}>
            <ThemedText style={{ color: colors.secondary }}>30 sec</ThemedText>
          </View>
        }
      />
      <Divider />

      {/* Mobile App Settings */}
      <SectionHeader title="Mobile App Settings" />
      <SettingItem
        title="Show onboarding tutorial"
        titleStyle={{ color: colors.primary }}
        rightComponent={<Toggle value={showOnboarding} onValueChange={setShowOnboarding} />}
      />
      <Divider />
      <SettingItem
        title="Default map zoom level"
        titleStyle={{ color: colors.primary }}
        rightComponent={
          <View style={styles.timeoutContainer}>
            <ThemedText style={{ color: colors.secondary }}>{mapZoom}</ThemedText>
          </View>
        }
      />
      <Divider />

      {/* Notifications Settings */}
      <SectionHeader title="Notifications Settings" />
      <SettingItem
        title="Email alerts for new user sign-ups"
        titleStyle={{ color: colors.primary }}
        rightComponent={<Toggle value={emailAlerts} onValueChange={setEmailAlerts} />}
      />
      <Divider />
      <SettingItem
        title="Notify on floorplan changes"
        titleStyle={{ color: colors.primary }}
        rightComponent={<Toggle value={notifyFloorplan} onValueChange={setNotifyFloorplan} />}
      />
      <Divider />

      {/* Reset to Defaults Button */}
      <TouchableOpacity 
        style={[styles.buttonContainer, { 
          backgroundColor: colors.card,
          borderColor: colors.secondary,
          borderWidth: 1,
        }]}
        onPress={resetToDefaults}
      >
        <ThemedText size="md" weight="bold" style={{ color: colors.secondary }}>
          Reset to Defaults
        </ThemedText>
      </TouchableOpacity>

      {/* Save Button */}
      <TouchableOpacity 
        style={[styles.buttonContainer, { backgroundColor: colors.primary }]}
        onPress={() => console.log('Settings saved')}
      >
        <ThemedText size="md" weight="bold" style={{ color: colors.background }}>
          Save Settings
        </ThemedText>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionHeaderContainer: {
    marginTop: 24,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  timeoutContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  buttonContainer: {
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AdminSettingsForm;