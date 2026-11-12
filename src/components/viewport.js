import { createContext, useContext } from 'react';
import { useWindowDimensions } from 'react-native';

export const ViewportContext = createContext(null);

export function useViewport() {
  const window = useWindowDimensions();
  return useContext(ViewportContext) || window;
}
