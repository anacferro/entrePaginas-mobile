import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { dialog } from './dialog';

async function availability() {
  if (Platform.OS === 'web') return 'web';
  try {
    if (!(await LocalAuthentication.hasHardwareAsync())) return 'unsupported';
    if (!(await LocalAuthentication.isEnrolledAsync())) return 'not_enrolled';
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

async function prompt(message) {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: message,
    cancelLabel: 'Cancelar',
    fallbackLabel: 'Usar senha do aparelho',
  });
  if (result.success) return true;

  if (result.error === 'lockout') {
    dialog.alert('Muitas tentativas', 'A biometria foi bloqueada temporariamente. Tente de novo em instantes ou use a senha do aparelho.');
  } else if (result.error !== 'user_cancel' && result.error !== 'system_cancel' && result.error !== 'app_cancel') {
    dialog.alert('Não foi possível confirmar', 'A verificação não foi concluída. Tente novamente.');
  }
  return false;
}

export const biometrics = {
  async confirmToProtect(title) {
    const state = await availability();
    if (state !== 'ready') {
      explainUnavailable(state);
      return false;
    }
    return prompt(`Proteger "${title}"`);
  },

  async unlock(title) {
    const state = await availability();
    if (state !== 'ready') {
      dialog.alert(
        'Livro protegido',
        state === 'web'
          ? 'Este livro é protegido por biometria. Abra-o no aplicativo do celular.'
          : 'Não foi possível verificar sua identidade neste aparelho, então o livro continua bloqueado.'
      );
      return false;
    }
    return prompt(`Abrir "${title}"`);
  },
};
