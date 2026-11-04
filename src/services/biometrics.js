import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { dialog } from './dialog';

const MAX_BIOMETRIC_FAILURES = 3;
const CANCELLED = ['user_cancel', 'system_cancel', 'app_cancel'];

async function availability() {
  if (Platform.OS === 'web') return 'web';
  try {
    if (!(await LocalAuthentication.hasHardwareAsync())) {
      const level = await LocalAuthentication.getEnrolledLevelAsync();
      return level === LocalAuthentication.SecurityLevel.SECRET ? 'passcode' : 'unsupported';
    }
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    if (level === LocalAuthentication.SecurityLevel.NONE) return 'not_enrolled';
    if (level === LocalAuthentication.SecurityLevel.SECRET) return 'passcode';
    return 'ready';
  } catch {
    return 'unsupported';
  }
}

function explainUnavailable(state) {
  if (state === 'web') {
    dialog.alert('Disponível só no celular', 'A proteção por biometria funciona apenas no aplicativo instalado no celular.');
  } else if (state === 'not_enrolled') {
    dialog.alert(
      'Nenhuma biometria cadastrada',
      'Cadastre uma digital, o rosto ou uma senha de tela nos ajustes do aparelho para proteger livros.'
    );
  } else {
    dialog.alert('Recurso indisponível', 'Este aparelho não oferece biometria ou bloqueio de tela para proteger livros.');
  }
}

async function promptPasscode(message) {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: message,
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false,
  });
  return result.success;
}

async function prompt(message, state) {
  if (state === 'passcode') return promptPasscode(message);

  let failures = 0;
  while (failures < MAX_BIOMETRIC_FAILURES) {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: message,
      cancelLabel: 'Cancelar',
      disableDeviceFallback: true,
    });
    if (result.success) return true;
    if (CANCELLED.includes(result.error)) return false;
    if (result.error === 'lockout') break;
    failures += 1;
  }

  return promptPasscode(message);
}

export const biometrics = {
  async confirmToProtect(title) {
    const state = await availability();
    if (state !== 'ready' && state !== 'passcode') {
      explainUnavailable(state);
      return false;
    }
    return prompt(`Proteger "${title}"`, state);
  },

  async unlock(title) {
    const state = await availability();
    if (state !== 'ready' && state !== 'passcode') {
      dialog.alert(
        'Livro protegido',
        state === 'web'
          ? 'Este livro é protegido por biometria. Abra-o no aplicativo do celular.'
          : 'Não foi possível verificar sua identidade neste aparelho, então o livro continua bloqueado.'
      );
      return false;
    }
    return prompt(`Abrir "${title}"`, state);
  },
};
