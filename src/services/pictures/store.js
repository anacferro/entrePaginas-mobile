import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';

const WEB_BUDGET = 2 * 1024 * 1024;

function toBase64(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(out);
}

export function base64Of(picture) {
  return toBase64(picture.bytes);
}

export function createPictureStore() {
  let webUsed = 0;
  let counter = 0;
  const stamp = Date.now();

  return {
    async save(picture, prefix = 'figure') {
      const extension = picture.mime === 'image/png' ? 'png' : picture.mime === 'image/gif' ? 'gif' : 'jpg';
      if (Platform.OS === 'web') {
        if (webUsed + picture.bytes.length > WEB_BUDGET) return null;
        webUsed += picture.bytes.length;
        return `data:${picture.mime};base64,${toBase64(picture.bytes)}`;
      }
      counter += 1;
      const file = new File(Paths.document, `${prefix}-${stamp}-${counter}.${extension}`);
      file.create({ overwrite: true });
      await file.write(picture.bytes);
      return file.uri;
    },
  };
}
