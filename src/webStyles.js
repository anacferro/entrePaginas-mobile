import { Platform } from 'react-native';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = 'input,textarea,select,[contenteditable],input:focus,textarea:focus,select:focus,[contenteditable]:focus,input:focus-visible,textarea:focus-visible,select:focus-visible,[contenteditable]:focus-visible{outline:none!important;outline-width:0!important;box-shadow:none!important}';
  document.head.appendChild(style);
}
