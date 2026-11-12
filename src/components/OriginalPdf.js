import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { Paths } from 'expo-file-system';
import { originalFiles } from '../services/originalFiles';

export default function OriginalPdf({ path, background, textColor }) {
  const [state, setState] = useState({ uri: null, failed: false });

  useEffect(() => {
    let alive = true;
    originalFiles.uri(path).then((uri) => {
      if (alive) setState({ uri, failed: !uri });
    }).catch(() => alive && setState({ uri: null, failed: true }));
    return () => {
      alive = false;
    };
  }, [path]);

  if (state.failed) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: background, padding: 24 }}>
        <Text style={{ color: textColor, textAlign: 'center' }}>O arquivo original deste livro não está neste aparelho.</Text>
      </View>
    );
  }
  if (!state.uri) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: background }}>
        <ActivityIndicator />
      </View>
    );
  }
  return (
    <WebView
      source={{ uri: state.uri }}
      originWhitelist={['*']}
      allowFileAccess
      allowingReadAccessToURL={Paths.document.uri}
      style={{ flex: 1, backgroundColor: background }}
    />
  );
}
