// ponytail: navigator.vibrate is a no-op on iOS Safari/desktop; feature-detected so it's silently skipped there
export function haptic(pattern: number | number[] = 8) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

export function hapticError() {
  haptic([15, 40, 15])
}
