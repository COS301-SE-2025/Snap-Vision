import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import AppButton from '../atoms/AppButton';
import AppSecondaryButton from '../atoms/AppSecondaryButton';
import SettingsHeader from '../molecules/SettingsHeader';

interface Floorplan {
  id: string;
  buildingId: string;
  buildingName: string;
  floorLabel: string;
  lastModified: string;
  localUri?: string;
}

interface Props {
  colors: any;
  navigation: any;
  floorplans: Floorplan[];
  selectedFloorplan: string | null;
  setSelectedFloorplan: (id: string) => void;
  handleUploadUpdated: () => void;
  handleAddNew: () => void;
  handleEditRooms: () => void;
  handleDelete: () => void;
  isLoading: boolean;
  error: string | null;
}

export default function AdminEditFloorplansContent({
  colors,
  navigation,
  floorplans,
  selectedFloorplan,
  setSelectedFloorplan,
  handleUploadUpdated,
  handleAddNew,
  handleEditRooms,
  handleDelete,
  isLoading,
  error
}: Props) {
  
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>Loading floorplans...</Text>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Edit Floorplans" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        
        {/* Error Display */}
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: colors.error }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        {/* Add New Floorplan Button */}
        <AppButton
          title="Add New Floorplan"
          onPress={handleAddNew}
          style={{ marginBottom: 24 }}
        />
        
        {/* Step 1: Select Floorplan */}
        <Text style={[styles.label, { color: colors.primary }]}>Select Existing Floorplan</Text>
        {floorplans.length === 0 ? (
          <Text style={{ color: colors.text, fontStyle: 'italic', marginBottom: 16 }}>
            No floorplans available. Add a new floorplan to get started.
          </Text>
        ) : (
          <View style={styles.floorplanList}>
            {floorplans.map(fp => (
              <TouchableOpacity
                key={fp.id}
                style={[
                  styles.floorplanItem,
                  { backgroundColor: selectedFloorplan === fp.id ? colors.primary : colors.card }
                ]}
                onPress={() => setSelectedFloorplan(fp.id)}
              >
                <Text style={{ 
                  color: selectedFloorplan === fp.id ? colors.background : colors.text,
                  fontWeight: '500'
                }}>
                  {fp.buildingName}
                </Text>
                <Text style={{ 
                  color: selectedFloorplan === fp.id ? colors.background : colors.text,
                  fontSize: 12
                }}>
                  {fp.floorLabel}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {/* Action Buttons for Selected Floorplan */}
        {selectedFloorplan && (
          <View style={styles.actionContainer}>
            <Text style={[styles.sectionHeader, { color: colors.primary }]}>
              Floorplan Actions
            </Text>
            
            <View style={[styles.selectedDetails, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
              {floorplans.find(fp => fp.id === selectedFloorplan) && (
                <>
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    <Text style={{ fontWeight: 'bold' }}>Building: </Text>
                    {floorplans.find(fp => fp.id === selectedFloorplan)?.buildingName}
                  </Text>
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    <Text style={{ fontWeight: 'bold' }}>Floor: </Text>
                    {floorplans.find(fp => fp.id === selectedFloorplan)?.floorLabel}
                  </Text>
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    <Text style={{ fontWeight: 'bold' }}>Last Modified: </Text>
                    {new Date(floorplans.find(fp => fp.id === selectedFloorplan)?.lastModified || '').toLocaleString()}
                  </Text>
                </>
              )}
            </View>
            
            {/* Removed the Upload Updated Floorplan button as requested */}
            
            {/* Edit Room POIs button */}
            <AppButton
              title="Edit Room POIs"
              onPress={handleEditRooms}
              style={{ 
                marginTop: 16,
                backgroundColor: colors.primary,
              }}
            />
            
            {/* Replaced TouchableOpacity with AppSecondaryButton */}
            <AppSecondaryButton
              title="Delete Floorplan"
              onPress={handleDelete}
              style={{ 
                marginTop: 16,
                backgroundColor: colors.error
              }}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  label: { 
    fontSize: 16, 
    fontWeight: '500', 
    marginBottom: 8 
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16
  },
  floorplanList: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    marginBottom: 24 
  },
  floorplanItem: {
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 100,
  },
  actionContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ddd'
  },
  selectedDetails: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
  },
  detailText: {
    marginBottom: 4,
    fontSize: 14
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16
  },
  errorText: {
    color: 'white',
    fontWeight: '500'
  }
});