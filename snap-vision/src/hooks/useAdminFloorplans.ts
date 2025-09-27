import { useEffect, useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import { FloorplanMeta, Location, Building } from '../types/floorplan.types';
import perf from '@react-native-firebase/perf';

export const useAdminFloorplans = (role: string | null, adminLocations: string[]) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floorplans, setFloorplans] = useState<FloorplanMeta[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const locSnap = await firestore().collection('locations').get();
      const allLocations = locSnap.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || doc.id,
      }));

      const filteredLocations =
        role === 'editor'
          ? allLocations.filter((loc) => adminLocations.includes(loc.id))
          : allLocations;

      setLocations(filteredLocations);
    } catch (err) {
      //consoleerror(err);
      setError('Failed to load locations');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBuildings = async (locationId: string) => {
    if (!locationId) return;
    const trace = await perf().newTrace('admin_load_buildings_perf');
    await trace.start();

    setIsLoading(true);
    try {
      const buildingSnap = await firestore()
        .collection(`locations/${locationId}/buildingPOIs`)
        .get();

      const buildingList = buildingSnap.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || doc.id,
      }));

      setBuildings(buildingList);
    } catch (err) {
      //consoleerror(err);
      setError('Failed to load buildings');
    } finally {
      setIsLoading(false);
      await trace.stop();
    }
  };

  const fetchFloorplans = async (locationId: string, buildingId: string) => {
    if (!locationId || !buildingId) return;
    const trace = await perf().newTrace('admin_load_floorplans_perf');
    await trace.start();
    setIsLoading(true);
    try {
      const snap = await firestore()
        .collection(`locations/${locationId}/buildingPOIs/${buildingId}/floorplans`)
        .get();

      const newFloorplans: FloorplanMeta[] = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          locationId,
          buildingId,
          buildingName: buildings.find((b) => b.id === buildingId)?.name || buildingId,
          floorLabel: data.floorLabel || doc.id,
          downloadURL: data.downloadURL,
          timestamp: data.timestamp?.toDate()?.toISOString() || '',
          id: `${buildingId}_${data.floorLabel || doc.id}`,
        };
      });

      //consolelog('Floorplans loaded:', newFloorplans);
      setFloorplans(newFloorplans);
    } catch (err) {
      //consoleerror(err);
      setError('Failed to load floorplans');
    } finally {
      setIsLoading(false);
      await trace.stop();
    }
  };

  const deleteFloorplan = async (floorplan: FloorplanMeta) => {
    try {
      setIsLoading(true);
      const { locationId, buildingId, floorLabel } = floorplan;

      await firestore()
        .doc(`locations/${locationId}/buildingPOIs/${buildingId}/floorplans/${floorLabel}`)
        .delete();

      const roomSnap = await firestore()
        .collection(`locations/${locationId}/roomPOIs`)
        .where('buildingId', '==', buildingId)
        .where('floorId', '==', floorLabel)
        .get();

      const pathSnap = await firestore()
        .collection(`locations/${locationId}/pathPOIs`)
        .where('buildingId', '==', buildingId)
        .where('floorId', '==', floorLabel)
        .get();

      const batch = firestore().batch();
      roomSnap.forEach((doc) => batch.delete(doc.ref));
      pathSnap.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      setFloorplans((prev) => prev.filter((fp) => fp.id !== floorplan.id));

      return { success: true };
    } catch (err) {
      //consoleerror(err);
      setError('Failed to delete floorplan');
      return { success: false, error: 'Failed to delete floorplan' };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    locations,
    buildings,
    floorplans,
    isLoading,
    error,
    fetchLocations,
    fetchBuildings,
    fetchFloorplans,
    deleteFloorplan,
  };
};
