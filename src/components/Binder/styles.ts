export const HOLO_SHEEN =
  'linear-gradient(115deg, transparent 0%, rgba(255,50,180,0.25) 20%, rgba(255,220,50,0.25) 35%, rgba(50,255,150,0.25) 50%, rgba(50,150,255,0.25) 65%, rgba(180,50,255,0.25) 80%, transparent 100%)';

export const binderGridSx = {
  display: 'grid',
  gap: { xs: 1.25, sm: 2 },
  gridTemplateColumns: {
    xs: 'repeat(3, minmax(0, 1fr))',
    sm: 'repeat(4, minmax(0, 1fr))',
    md: 'repeat(5, minmax(0, 1fr))',
    lg: 'repeat(6, minmax(0, 1fr))',
  },
} as const;
