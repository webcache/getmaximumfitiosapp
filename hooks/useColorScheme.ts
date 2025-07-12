// Force light theme - ignore system dark/light mode
export function useColorScheme() {
  return 'light' as const;
}
