// Icones du questionnaire coach (trait fin, 24 px), dessinees ici :
// l'app n'embarque pas de police d'icones.
const P = {
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5',
  target: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8zM12 13a1 1 0 100-2 1 1 0 000 2z',
  'ruler-measure': 'M3 7h18v10H3zM7 7v4M11 7v3M15 7v4M19 7v3',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 3',
  barbell: 'M2 12h2M20 12h2M5 8v8M8 6v12M16 6v12M19 8v8M8 12h8',
  salad: 'M4 11h16a8 8 0 01-16 0zM8 11a4 4 0 017-2.6M12 11a3 3 0 015-2',
  cup: 'M5 8h12v5a6 6 0 01-12 0zM17 9h1.5a2.5 2.5 0 010 5H17M8 3v2M11 3v2M14 3v2',
  puzzle: 'M4 7h4a2 2 0 114 0h4v4a2 2 0 110 4v4h-4a2 2 0 10-4 0H4v-4a2 2 0 100-4z',
  'heart-rate-monitor': 'M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10zM6 12h3l1.5-2 2 4 1.5-2h4',
  moon: 'M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z',
  sparkles: 'M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8zM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z',
  flame: 'M12 21c-3.9 0-7-2.7-7-6.5 0-3 2-5.2 3.5-6.8.3 1.8 1.2 3 2.5 3.8C11 8 12 5 14.5 3c.2 3 1.5 4.6 3 6.4 1 1.3 1.5 2.9 1.5 4.6C19 18 15.9 21 12 21z',
  'arrows-exchange': 'M7 10h14l-4-4M17 14H3l4 4',
  bolt: 'M13 3L5 14h6l-1 7 8-11h-6z',
  'gender-female': 'M12 14a5 5 0 100-10 5 5 0 000 10zM12 14v7M9 18h6',
  'gender-male': 'M10 20a6 6 0 100-12 6 6 0 000 12zM14.5 9.5L20 4M15 4h5v5',
  'alert-circle': 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 8v5M12 16h.01',
  'circle-check': 'M12 21a9 9 0 100-18 9 9 0 000 18zM8.5 12l2.5 2.5 4.5-5',
  scale: 'M5 20h14l-1.5-12h-11zM9 8a3 3 0 016 0',
  route: 'M6 19a2 2 0 100-4 2 2 0 000 4zM18 9a2 2 0 100-4 2 2 0 000 4zM6 15V9a3 3 0 013-3h7M18 9v6a3 3 0 01-3 3H8',
  'cloud-check': 'M7 18a4.5 4.5 0 01-.6-9A6 6 0 0118 9.5a4 4 0 01-1 8.5zM9.5 13l2 2 3.5-3.5',
  'shield-check': 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 12l2 2 4-4',
  check: 'M5 12l5 5 9-10',
  info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 8h.01',
};
export function Icone({ nom, taille = 22 }) {
  const d = P[nom] || P.user;
  return (
    <svg viewBox="0 0 24 24" width={taille} height={taille} fill="none" stroke="currentColor"
      stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={d} /></svg>
  );
}
