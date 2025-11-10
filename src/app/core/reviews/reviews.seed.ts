import { Review } from './reviews.models';

const GAMES = [
  'Elder Quest Online',
  'Nebula Raiders',
  'Frostfall Citadel',
  'Solar Drift',
  'Mystic Valley',
  'Chrome Horizon',
  'Legends Reborn',
  'Echoes of Aether',
  'Circuit Clash',
  'Crimson Tide',
  'Parallel Dunes',
  'Verdant Grove'
];

const TAGS = [
  'RPG',
  'Multiplayer',
  'Indie',
  'Strategy',
  'Adventure',
  'Horror',
  'Sci-Fi',
  'Pixel Art',
  'Early Access',
  'Story Rich',
  'Competitive',
  'Co-op'
];

const TITLES = [
  'Una sorpresa en cada partida',
  'La estrategia paga con creces',
  'Una montaña rusa emocional',
  'Pequeñas mejoras que suman',
  'Cuando la narrativa manda',
  'El multijugador que quería',
  'Un giro inesperado',
  'Años luz por delante',
  'El mapa más creativo',
  'Un festín de mecánicas'
];

const BODIES = [
  'La progresión se siente orgánica y cada misión invita a explorar sistemas secundarios que normalmente pasaría por alto.',
  'Tiene algunos problemas de balanceo, pero las partidas largas recompensan a quienes aprenden a gestionar recursos con paciencia.',
  'La dirección artística hace que cada captura parezca una postal; una pena que no todos los biomas estén igual de cuidados.',
  'El modo cooperativo brilla cuando se coordina bien el equipo, aunque necesita mejores herramientas de comunicación integrada.',
  'Hay bugs simpáticos y otros no tanto. Aun así, el estudio responde rápido y la comunidad prepara guías muy completas.',
  'Cada actualización agrega eventos temporales que renuevan el interés y empujan a volver semana a semana.',
  'No esperaba engancharme tanto con el minijuego de fabricación; es profundo sin ser impenetrable.',
  'El combate es ágil, pero se nota que el estudio tomó decisiones para favorecer a los recién llegados.',
  'La banda sonora se queda pegada y logra acompañar incluso los momentos más tensos.',
  'Tiene momentos brillantes en la historia principal, aunque el final necesita un mejor ritmo.'
];

const AUTHORS = [
  { id: 'user-arthur', name: 'Arthur Vega' },
  { id: 'user-lucia', name: 'Lucía Serrano' },
  { id: 'user-nadia', name: 'Nadia Campos' },
  { id: 'user-kenji', name: 'Kenji Morita' },
  { id: 'user-samir', name: 'Samir Haddad' },
  { id: 'user-olivia', name: 'Olivia Duarte' },
  { id: 'user-axel', name: 'Axel Moreno' },
  { id: 'user-ines', name: 'Inés Koval' },
  { id: 'user-ravi', name: 'Ravi Patel' },
  { id: 'user-clara', name: 'Clara Molina' }
];

const now = Date.now();

const pickTags = (index: number, game: string): string[] => {
  const primary = TAGS[index % TAGS.length];
  const secondary = TAGS[(index * 3) % TAGS.length];
  const tertiary = TAGS[(index + 5) % TAGS.length];
  const set = new Set<string>([primary, secondary]);
  if (index % 2 === 0) {
    set.add(tertiary);
  }
  if (index % 4 === 0) {
    set.add('Destacado');
  }
  set.add(game);
  return Array.from(set);
};

const buildBody = (index: number): string => {
  const base = BODIES[index % BODIES.length];
  const followUp = BODIES[(index + 3) % BODIES.length];
  return `${base}\n\n${followUp}`;
};

export const REVIEWS_SEED: Review[] = Array.from({ length: 60 }, (_, idx) => {
  const game = GAMES[idx % GAMES.length];
  const author = AUTHORS[idx % AUTHORS.length];
  const createdAt = new Date(now - idx * 6 * 60 * 60 * 1000 - (idx % 5) * 45 * 60 * 1000).toISOString();
  const updatedAt = idx % 4 === 0 ? new Date(Date.parse(createdAt) + 90 * 60 * 1000).toISOString() : undefined;
  const rating = (4 + (idx % 7)) % 11;
  const votes = Math.round((Math.sin(idx / 3) + 1) * 18 + idx * 0.75);
  const comments = (idx * 7) % 140;

  return {
    id: `review-${idx + 1}`,
    title: `${TITLES[idx % TITLES.length]} (${idx + 1})`,
    game,
    authorId: author.id,
    authorName: author.name,
    tags: pickTags(idx, game),
    rating,
    body: buildBody(idx),
    votes,
    comments,
    createdAt,
    updatedAt,
  } satisfies Review;
});
