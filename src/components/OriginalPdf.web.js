import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { originalFiles } from '../services/originalFiles';

export default function OriginalPdf({ path, background, textColor }) {
  const [state, setState] = useState({ uri: null, failed: false });

  useEffect(() => {
    let current = null;
    let alive = true;
    originalFiles.uri(path).then((uri) => {
      current = uri;
      if (alive) setState({ uri, failed: !uri });
    }).catch(() => alive && setState({ uri: null, failed: true }));
    return () => {
      alive = false;
      if (current) URL.revokeObjectURL(current);
    };
  }, [path]);

  if (state.failed) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: background, padding: 24 }}>
        <Text style={{ color: textColor, textAlign: 'center' }}>O arquivo original deste livro não está neste navegador.</Text>
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
  return React.createElement('iframe', {
    src: `${state.uri}#view=FitH&toolbar=0&navpanes=0&scrollbar=0`,
    title: 'PDF original',
    style: { flex: 1, width: '100%', height: '100%', border: 0, backgroundColor: background },
  });
}
