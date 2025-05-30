// import React, { forwardRef } from 'react';
// import { Platform, StyleSheet } from 'react-native';
// import { WebView } from 'react-native-webview';
// import type { WebView as WebViewType } from 'react-native-webview';

// type Props = {
//   onMessage: (event: any) => void;
// };

// const MapWebView = forwardRef<WebViewType, Props>(({ onMessage }, ref) => {
//   return (
//     <WebView
//       ref={ref}
//       source={{
//         uri: Platform.OS === 'android'
//           ? 'file:///android_asset/leaflet.html'
//           : './leaflet.html',
//       }}
//       javaScriptEnabled
//       domStorageEnabled
//       allowFileAccess
//       allowUniversalAccessFromFileURLs
//       mixedContentMode="always"
//       originWhitelist={['*']}
//       onMessage={onMessage}
//       style={styles.webview}
//       onError={(e) => {
//         console.error('WebView error:', e.nativeEvent.description);
//       }}
//     />
//   );
// });

// export default MapWebView;

// const styles = StyleSheet.create({
//   webview: {
//     flex: 1,
//     backgroundColor: 'transparent',
//   },
// });
