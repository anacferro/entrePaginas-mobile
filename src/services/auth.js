import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase';

const ERROR_MESSAGES = {
  'auth/invalid-email': 'O e-mail informado não é válido.',
  'auth/missing-email': 'Informe o e-mail da conta.',
  'auth/missing-password': 'Informe a senha.',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/email-already-in-use': 'Já existe uma conta com esse e-mail. Tente entrar.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
  'auth/network-request-failed': 'Sem conexão com a internet. Verifique a rede e tente de novo.',
  'auth/operation-not-allowed': 'O login por e-mail e senha ainda não foi ativado no Firebase.',
};

function friendly(error) {
  const message = ERROR_MESSAGES[error?.code] || 'Não foi possível concluir a operação. Tente novamente.';
  const wrapped = new Error(message);
  wrapped.code = error?.code;
  return wrapped;
}

function assertConfigured() {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('O Firebase não está configurado. Preencha o arquivo .env conforme o README.');
  }
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

  async signUp(name, email, password) {
    assertConfigured();
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (name.trim()) await updateProfile(credential.user, { displayName: name.trim() });
      return credential.user;
    } catch (e) {
      throw friendly(e);
    }
  },

  async signIn(email, password) {
    assertConfigured();
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      return credential.user;
    } catch (e) {
      throw friendly(e);
    }
  },

  async resetPassword(email) {
    assertConfigured();
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (e) {
      throw friendly(e);
    }
  },

  async signOut() {
    if (auth) await firebaseSignOut(auth);
  },
};
