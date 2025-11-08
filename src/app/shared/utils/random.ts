export function randomDelay(): number {
  return 400 + Math.floor(Math.random() * 400);
}

export function uid(prefix = 'u'): string {
  const randomValue =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `${prefix}-${randomValue}`;
}
