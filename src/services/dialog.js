import { Alert, Platform } from 'react-native';

export const dialog = {
  alert(title, message, buttons = []) {
    if (Platform.OS !== 'web') {
      Alert.alert(title, message, buttons);
      return;
    }

    const text = message ? `${title}\n\n${message}` : title;
    const action = buttons.find((b) => b.style !== 'cancel');
    const hasCancel = buttons.some((b) => b.style === 'cancel');

    if (hasCancel) {
      if (window.confirm(text)) action?.onPress?.();
      return;
    }

    window.alert(text);
    action?.onPress?.();
  },
};
