import { useState, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

const BT = '[BT]';

interface UseFloorplanManagerParams {
  locationId: string;
  buildingId: string;
  selectedFloorId: string;
}

export function useFloorplanManager({
  locationId,
  buildingId,
  selectedFloorId,
}: UseFloorplanManagerParams) {
  const [floorplanUrl, setFloorplanUrl] = useState<string | null>(null);
  const [floorplanLoading, setFloorplanLoading] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!selectedFloorId) {
        setFloorplanUrl(null);
        return;
      }

      try {
        setFloorplanLoading(true);
        setFloorplanUrl(null);

        const fpSnap = await firestore()
          .collection('locations')
          .doc(locationId)
          .collection('buildingPOIs')
          .doc(buildingId)
          .collection('floorplans')
          .where('floorId', '==', selectedFloorId)
          .limit(1)
          .get();

        let url: string | null = null;
        if (!fpSnap.empty) {
          const data: any = fpSnap.docs[0].data();
          url = data?.imageUrl || data?.url || null;
          if (!url && data?.storagePath) {
            try {
              url = await storage().ref(data.storagePath).getDownloadURL();
            } catch (e) {
              //console.warn(BT, 'getDownloadURL failed', e);
            }
          }
        }

        if (!url) {
          try {
            const baseRef = storage().ref(`floorplans/${locationId}/${buildingId}`);
            const list = await baseRef.listAll();
            const match =
              list.items.find((it) =>
                it.name.toLowerCase().includes(String(selectedFloorId).toLowerCase()),
              ) || list.items[0];
            if (match) url = await match.getDownloadURL();
          } catch (e) {
            //console.warn(BT, 'Storage fallback failed', e);
          }
        }

        if (!cancelled) setFloorplanUrl(url ?? null);
        //console.log(BT, 'Floorplan URL for floor', selectedFloorId, '=>', url ? 'OK' : 'MISSING');
      } catch (e) {
        //console.warn(BT, 'Floorplan fetch failed', e);
        if (!cancelled) setFloorplanUrl(null);
      } finally {
        if (!cancelled) setFloorplanLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [buildingId, locationId, selectedFloorId]);

  return {
    floorplanUrl,
    floorplanLoading,
  };
}
