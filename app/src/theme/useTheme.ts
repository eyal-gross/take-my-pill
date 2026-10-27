import { useColorScheme } from 'react-native';
import { themes, type Theme } from './tokens';

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'light' ? themes.light : themes.dark;
}
