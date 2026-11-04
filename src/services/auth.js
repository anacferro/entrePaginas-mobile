import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase';

const LOGIN_PAGE = `https://${process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN}/`;

const ERROR_MESSAGES = {
  cancelled: 'Login cancelado. Toque em "Continuar com o Google" para tentar de novo.',
  'auth/popup-closed-by-user': 'Login cancelado. Toque em "Continuar com o Google" para tentar de novo.',
  'auth/cancelled-popup-request': 'Login cancelado. Toque em "Continuar com o Google" para tentar de novo.',
  'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Permita pop-ups para este site e tente de novo.',
  'auth/network-request-failed': 'Sem conexão com a internet. Verifique a rede e tente de novo.',
  'auth/operation-not-allowed': 'O login com Google ainda não foi ativado no Firebase.',
  'auth/user-disabled': 'Esta conta foi desativada.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
  'auth/account-exists-with-different-credential': 'Já existe uma conta com esse e-mail usando outro método de login.',
};

function friendly(error) {
  const key = error?.code || error?.message;
  const message = ERROR_MESSAGES[key] || 'Não foi possível entrar com o Google. Tente novamente.';
  const wrapped = new Error(message);
  wrapped.code = error?.code;
  return wrapped;
}

function assertConfigured() {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('O Firebase não está configurado. Preencha o arquivo .env conforme o README.');
  }
}

function parseFragment(url) {
  const fragment = url.split('#')[1] || '';
  const params = {};
  fragment.split('&').forEach((pair) => {
    const [key, value = ''] = pair.split('=');
    if (key) params[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '));
  });
  return params;
}

async function signInOnWeb() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const credential = await signInWithPopup(auth, provider);
  return credential.user;
}

async function signInOnDevice() {
  const returnUrl = Linking.createURL('auth');
  const result = await WebBrowser.openAuthSessionAsync(
    `${LOGIN_PAGE}?return=${encodeURIComponent(returnUrl)}`,
    returnUrl
  );

  if (result.type !== 'success') throw Object.assign(new Error('cancelled'), { code: 'cancelled' });

  const params = parseFragment(result.url);
  if (params.error || !params.idToken) throw Object.assign(new Error('cancelled'), { code: 'cancelled' });

  const credential = GoogleAuthProvider.credential(params.idToken, params.accessToken || undefined);
  const signed = await signInWithCredential(auth, credential);
  return signed.user;
}

export const authService = {
  isConfigured: isFirebaseConfigured,

  onChange(callback) {
    if (!auth) {
      callback(null);
      return () => {};
    }
    return onAuthStateChanged(auth, callback);
  },

  async signInWithGoogle() {
    assertConfigured();
    try {
      return Platform.OS === 'web' ? await signInOnWeb() : await signInOnDevice();
    } catch (e) {
      throw friendly(e);
    }
  },

  async signOut() {
    if (auth) await firebaseSignOut(auth);
  },
};
