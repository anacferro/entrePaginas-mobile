import { Platform, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import { dialog } from './dialog';

async function requestPermission() {
  let permission = await ImagePicker.getCameraPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) {
    permission = await ImagePicker.requestCameraPermissionsAsync();
  }
  return permission;
}

function explainDenied(canAskAgain) {
  if (canAskAgain) {
    dialog.alert(
      'Câmera não autorizada',
      'Sem acesso à câmera não é possível fotografar a página. Você pode continuar escrevendo o texto normalmente.'
    );
    return;
  }

  dialog.alert(
    'Câmera bloqueada',
    'O acesso à câmera foi negado. Para fotografar páginas, libere a permissão nos ajustes do aparelho. Você pode continuar escrevendo o texto normalmente.',
    [
      { text: 'Agora não', style: 'cancel' },
      { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() },
    ]
  );
}

async function keepPhoto(uri) {
  const destination = new File(Paths.document, `page-${Date.now()}.jpg`);
  await new File(uri).copy(destination);
  return destination.uri;
}

export const camera = {
  async capturePage() {
    if (Platform.OS !== 'web') {
      const permission = await requestPermission();
      if (!permission.granted) {
        explainDenied(permission.canAskAgain);
        return null;
      }
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
      if (result.canceled || !result.assets?.length) return null;

      const uri = result.assets[0].uri;
      return Platform.OS === 'web' ? uri : await keepPhoto(uri);
    } catch (e) {
      dialog.alert('Falha na câmera', 'Não foi possível abrir a câmera ou salvar a foto. Tente novamente.');
      return null;
    }
  },
};
