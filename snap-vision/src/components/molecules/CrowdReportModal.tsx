// // src/components/molecules/CrowdReportModal.tsx
// import React from 'react';
// import { Modal, View, Text, StyleSheet, Button } from 'react-native';
// import { Picker } from '@react-native-picker/picker';

// interface Props {
//   visible: boolean;
//   selectedDensity: string;
//   onChangeDensity: (value: string) => void;
//   onSubmit: () => void;
//   onCancel: () => void;
// }

// export default function CrowdReportModal({
//   visible,
//   selectedDensity,
//   onChangeDensity,
//   onSubmit,
//   onCancel,
// }: Props) {
//   return (
//     <Modal transparent animationType="slide" visible={visible}>
//       <View style={styles.container}>
//         <View style={styles.content}>
//           <Text style={styles.title}>Select Crowd Density</Text>
//           <Picker selectedValue={selectedDensity} onValueChange={onChangeDensity}>
//             <Picker.Item label="Empty" value="empty" />
//             <Picker.Item label="Light" value="light" />
//             <Picker.Item label="Moderate" value="moderate" />
//             <Picker.Item label="Crowded" value="crowded" />
//             <Picker.Item label="Overcrowded" value="overcrowded" />
//           </Picker>
//           <Button title="Submit" onPress={onSubmit} />
//           <Button title="Cancel" onPress={onCancel} />
//         </View>
//       </View>
//     </Modal>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   content: {
//     backgroundColor: 'white',
//     padding: 20,
//     borderRadius: 10,
//     width: '80%',
//   },
//   title: {
//     fontWeight: 'bold',
//     fontSize: 16,
//     marginBottom: 10,
//   },
// });
