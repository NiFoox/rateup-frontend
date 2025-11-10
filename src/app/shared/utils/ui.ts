const hashString = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const avatarColor = (id: string): string => {
  if (!id) {
    return 'hsl(210 70% 40%)';
  }
  const hash = hashString(id);
  const hue = Math.round(((hash % 360) + 360) % 360);
  const saturation = 65;
  const lightness = 45;
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
};

export const fromNow = (iso: string): string => {
  if (!iso) {
    return '';
  }
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) {
    return '';
  }

  const now = Date.now();
  let diff = now - timestamp;
  if (diff < 0) {
    diff = 0;
  }

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 365 * day;

  if (diff < minute) {
    return 'hace un momento';
  }
  if (diff < hour) {
    const minutes = Math.floor(diff / minute);
    return `hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  }
  if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  }
  if (diff < month) {
    const days = Math.floor(diff / day);
    return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
  }
  if (diff < year) {
    const months = Math.floor(diff / month);
    return `hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
  }
  const years = Math.floor(diff / year);
  return `hace ${years} ${years === 1 ? 'año' : 'años'}`;
};
