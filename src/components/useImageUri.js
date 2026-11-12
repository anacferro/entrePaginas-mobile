import { useEffect, useState } from 'react';
import { webImages } from '../services/webImages';

export default function useImageUri(uri) {
  const [resolved, setResolved] = useState(webImages.isStored(uri) ? null : uri);

  useEffect(() => {
    let alive = true;
    if (!webImages.isStored(uri)) {
      setResolved(uri);
      return undefined;
    }
    webImages.resolve(uri).then((url) => alive && setResolved(url)).catch(() => alive && setResolved(null));
    return () => {
      alive = false;
    };
  }, [uri]);

  return resolved;
}
