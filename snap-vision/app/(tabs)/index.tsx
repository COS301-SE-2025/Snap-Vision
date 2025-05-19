import { View, Text } from 'react-native';
import { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

export default function HomeScreen() {
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    const testFirestore = async () => {
      try {
        await addDoc(collection(db, 'testCollection'), {
          name: 'SnapVision Test',
          createdAt: Date.now(),
        });

        const snapshot = await getDocs(collection(db, 'testCollection'));
        const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDocs(results);
      } catch (err) {
        console.error('❌ Firestore Error:', err);
      }
    };

    testFirestore();
  }, []);

  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>📦 Firestore Results:</Text>
      {docs.map(doc => (
        <Text key={doc.id}>{JSON.stringify(doc)}</Text>
      ))}
    </View>
  );
}
