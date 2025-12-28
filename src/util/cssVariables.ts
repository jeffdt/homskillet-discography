export function updateAccentColors(accent: string, accentDark: string): void {
  document.documentElement.style.setProperty('--accent', accent);
  document.documentElement.style.setProperty('--accent-dark', accentDark);
}
