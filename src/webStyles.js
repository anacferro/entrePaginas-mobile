import { Platform } from 'react-native';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = 'input:focus,textarea:focus,select:focus,[contenteditable]:focus{outline:none!important;box-shadow:none!important}';
  document.head.appendChild(style);
}
