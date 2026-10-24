import { describe, expect, it } from 'vitest';

import { DEMO_PERSONAS } from '../personas';
import { simulatePersona, summarizeSimulation } from '../simulate';

const NOW = new Date('2026-10-23T17:00:00Z');

const persona = (key: string) => DEMO_PERSONAS.find((p) => p.key === key)!;
const summary = (key: string) => summarizeSimulation(simulatePersona(persona(key), NOW));

describe('simulatePersona golden', () => {
  it('matches the maya snapshot', () => {
    expect(summary('maya')).toMatchInlineSnapshot(`
      "d-14 2026-10-09 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima,ji | review,study,recall,kotoba-bubble,quiz | missed getsuyoubi,kayoubi,doyoubi,nichiyoubi
      d-12 2026-10-11 due 13 cap 25 review=13 session=getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,listen,quiz | missed doyoubi,getsuyoubi,nichiyoubi,kayoubi
      d-11 2026-10-12 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,doyoubi,nichiyoubi,fun,suiyoubi,mokuyoubi,kinyoubi,kyou,ashita,kinou,ima | review,recall,kotoba-bubble,fill,quiz | missed getsuyoubi,kayoubi,doyoubi,nichiyoubi
      d-10 2026-10-13 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,doyoubi,nichiyoubi,suiyoubi,mokuyoubi,kinyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,fill,quiz | missed getsuyoubi,kayoubi,doyoubi,nichiyoubi
      d-9 2026-10-14 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,doyoubi,nichiyoubi,suiyoubi,mokuyoubi,kinyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,fill,quiz | missed getsuyoubi,kayoubi,doyoubi,nichiyoubi
      d-8 2026-10-15 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,doyoubi,nichiyoubi,suiyoubi,mokuyoubi,kinyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,fill,quiz | missed getsuyoubi,kayoubi,doyoubi,nichiyoubi
      d-7 2026-10-16 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,doyoubi,nichiyoubi,suiyoubi,mokuyoubi,kinyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,fill,quiz | missed getsuyoubi,kayoubi,doyoubi,nichiyoubi
      d-5 2026-10-18 due 4 cap 25 review=4 session=getsuyoubi,kayoubi,doyoubi,nichiyoubi,suiyoubi,mokuyoubi,kinyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,fill,quiz | missed getsuyoubi,doyoubi,nichiyoubi,kayoubi
      d-4 2026-10-19 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,doyoubi,nichiyoubi,suiyoubi,mokuyoubi,kinyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,fill,quiz | missed getsuyoubi,kayoubi,doyoubi,nichiyoubi
      d-3 2026-10-20 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,doyoubi,nichiyoubi,suiyoubi,mokuyoubi,kinyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,fill,quiz | missed getsuyoubi,kayoubi,doyoubi,nichiyoubi
      d-2 2026-10-21 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,doyoubi,nichiyoubi,suiyoubi,mokuyoubi,kinyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,fill,quiz | missed getsuyoubi,kayoubi,doyoubi,nichiyoubi
      d-1 2026-10-22 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,doyoubi,nichiyoubi,suiyoubi,mokuyoubi,kinyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,fill,quiz | missed getsuyoubi,kayoubi,doyoubi,nichiyoubi
      getsuyoubi learning 34/34 tricky next+9m
      kayoubi learning 35/35 tricky next+14m
      suiyoubi strong 34/0 next+5d
      mokuyoubi strong 32/0 next+5d
      kinyoubi strong 33/0 next+5d
      doyoubi learning 31/31 tricky next+10m
      nichiyoubi learning 37/37 tricky next+14m
      kyou strong 35/0 next+5d
      ashita strong 33/0 next+5d
      kinou strong 34/0 next+5d
      ima strong 32/0 next+5d
      ji strong 34/0 next+5d
      fun strong 10/0 next+4d
      shuumatsu strong 11/0 next+7d
      today: due 0 cap 20 | review,recall,kotoba-bubble,fill,quiz"
    `);
  });

  it('matches the ken snapshot', () => {
    expect(summary('ken')).toMatchInlineSnapshot(`
      "d-14 2026-10-09 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima,ji | review,study,recall,kotoba-bubble,quiz
      d-13 2026-10-10 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,listen,quiz
      d-12 2026-10-11 due 1 cap 20 review=1 session=fun,getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima | review,recall,kotoba-bubble,fill,quiz | missed mokuyoubi
      d-11 2026-10-12 due 0 cap 20 review=0 session=mokuyoubi,getsuyoubi,kayoubi,suiyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,fill,quiz
      d-10 2026-10-13 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,fill,quiz
      d-9 2026-10-14 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,fill,quiz
      d-8 2026-10-15 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,fill,quiz | missed mokuyoubi
      d-7 2026-10-16 due 0 cap 20 review=0 session=mokuyoubi,getsuyoubi,kayoubi,suiyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,fill,quiz
      d-6 2026-10-17 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,fill,quiz
      getsuyoubi strong 26/0 next-3d
      kayoubi strong 22/0 next-3d
      suiyoubi strong 25/0 next-3d
      mokuyoubi strong 23/6 next-3d
      kinyoubi strong 24/0 next-3d
      doyoubi strong 25/0 next-3d
      nichiyoubi strong 25/0 next-3d
      kyou strong 24/0 next-3d
      ashita strong 27/0 next-3d
      kinou strong 24/0 next-3d
      ima strong 25/0 next-3d
      ji strong 21/0 next-1158m
      fun strong 9/0 next-1d
      shuumatsu strong 7/0 next-572m
      today: due 14 cap 40 | review,recall,kotoba-bubble,fill,quiz"
    `);
  });

  it('matches the sora snapshot', () => {
    expect(summary('sora')).toMatchInlineSnapshot(
      `"today: due 0 cap 20 | review,study,recall,kotoba-bubble,quiz"`,
    );
  });

  it('matches the hana snapshot', () => {
    expect(summary('hana')).toMatchInlineSnapshot(`
      "d-14 2026-10-09 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima,ji | review,study,recall,kotoba-bubble,quiz
      d-13 2026-10-10 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,listen,quiz
      d-12 2026-10-11 due 1 cap 20 review=1 session=fun,getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima | review,recall,kotoba-bubble,fill,quiz
      d-11 2026-10-12 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,fill,quiz | missed kinyoubi
      d-10 2026-10-13 due 0 cap 20 review=0 session=kinyoubi,getsuyoubi,kayoubi,suiyoubi,mokuyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,fill,quiz
      d-8 2026-10-15 due 1 cap 25 review=1 session=fun,getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima | review,recall,kotoba-bubble,fill,quiz
      d-7 2026-10-16 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,fill,quiz
      d-6 2026-10-17 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,fill,quiz
      d-5 2026-10-18 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,fill,quiz
      d-4 2026-10-19 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,fill,quiz
      d-3 2026-10-20 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,fill,quiz
      d-2 2026-10-21 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,fill,quiz
      d-1 2026-10-22 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,fill,quiz
      getsuyoubi strong 37/0 next+4d
      kayoubi strong 33/0 next+4d
      suiyoubi strong 37/0 next+4d
      mokuyoubi strong 36/0 next+4d
      kinyoubi strong 36/3 next+4d
      doyoubi strong 33/0 next+4d
      nichiyoubi strong 37/0 next+5d
      kyou strong 32/0 next+4d
      ashita strong 32/0 next+4d
      kinou strong 37/0 next+4d
      ima strong 37/0 next+5d
      ji strong 30/0 next+7d
      fun strong 16/0 next+9d
      shuumatsu strong 11/0 next+7d
      today: due 0 cap 20 | review,recall,kotoba-bubble,fill,quiz"
    `);
  });

  it('matches the leo snapshot', () => {
    expect(summary('leo')).toMatchInlineSnapshot(`
      "d-13 2026-10-10 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima,ji | review,study,recall,kotoba-bubble,quiz | missed getsuyoubi,kayoubi,suiyoubi,ji
      d-11 2026-10-12 due 13 cap 25 review=13 session=getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,listen,quiz | missed getsuyoubi,ji,shuumatsu,kayoubi,fun
      d-9 2026-10-14 due 5 cap 25 review=5 session=getsuyoubi,kayoubi,ji,fun,shuumatsu,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita | review,recall,kotoba-bubble,fill,quiz | missed kayoubi,getsuyoubi,ji,mokuyoubi,kinyoubi
      d-7 2026-10-16 due 6 cap 25 review=6 session=getsuyoubi,kayoubi,mokuyoubi,kinyoubi,ji,kinou,suiyoubi,doyoubi,nichiyoubi,kyou,ashita,ima | review,recall,kotoba-bubble,fill,quiz | missed ji,kayoubi,getsuyoubi,doyoubi,nichiyoubi
      d-5 2026-10-18 due 5 cap 25 review=5 session=getsuyoubi,kayoubi,doyoubi,nichiyoubi,ji,suiyoubi,mokuyoubi,kinyoubi,kyou,ashita,kinou,ima | review,recall,kotoba-bubble,fill,quiz | missed getsuyoubi,ji,kayoubi,suiyoubi,mokuyoubi,kinyoubi
      d-3 2026-10-20 due 6 cap 25 review=6 session=getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,ji,doyoubi,nichiyoubi,kyou,ashita,kinou,ima | review,recall,kotoba-bubble,fill,quiz | missed kayoubi,ji,getsuyoubi,doyoubi,nichiyoubi,shuumatsu,fun
      d-1 2026-10-22 due 7 cap 25 review=7 session=getsuyoubi,kayoubi,doyoubi,nichiyoubi,ji,fun,shuumatsu,suiyoubi,mokuyoubi,kinyoubi,kyou,ashita | review,recall,kotoba-bubble,fill,quiz | missed nichiyoubi,ji,kayoubi,doyoubi,getsuyoubi,suiyoubi,mokuyoubi,kinyoubi
      getsuyoubi learning 24/24 tricky next+15m
      kayoubi learning 25/25 tricky next+22m
      suiyoubi learning 20/8 next+22m
      mokuyoubi learning 22/8 next+17m
      kinyoubi learning 22/9 next+22m
      doyoubi learning 23/10 next+21m
      nichiyoubi learning 23/9 next+21m
      kyou strong 22/0 next+5d
      ashita strong 20/0 next+5d
      kinou strong 16/0 next+9d
      ima strong 17/0 next+2d
      ji learning 24/24 tricky next+21m
      fun strong 11/2 next+2d
      shuumatsu strong 11/2 next+2d
      today: due 0 cap 20 | review,recall,kotoba-bubble,fill,quiz"
    `);
  });

  it('matches the rin snapshot', () => {
    expect(summary('rin')).toMatchInlineSnapshot(`
      "d-6 2026-10-17 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima,ji | review,study,recall,kotoba-bubble,quiz
      d-5 2026-10-18 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,listen,quiz | missed ashita,kinou
      d-4 2026-10-19 due 0 cap 20 review=0 session=ashita,kinou,fun,getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ima | review,recall,kotoba-bubble,fill,quiz
      d-3 2026-10-20 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,fill,quiz | missed kyou
      d-2 2026-10-21 due 0 cap 20 review=0 session=kyou,getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,ashita,kinou,ima,ji | review,recall,kotoba-bubble,fill,quiz
      d-1 2026-10-22 due 0 cap 20 review=0 session=getsuyoubi,kayoubi,suiyoubi,mokuyoubi,kinyoubi,doyoubi,nichiyoubi,kyou,ashita,kinou,ima,ji | review,recall,kotoba-bubble,fill,quiz
      getsuyoubi strong 17/0 next+2d
      kayoubi strong 16/0 next+2d
      suiyoubi strong 15/0 next+2d
      mokuyoubi strong 16/0 next+2d
      kinyoubi strong 16/0 next+2d
      doyoubi strong 15/0 next+2d
      nichiyoubi strong 16/0 next+2d
      kyou strong 16/3 next+2d
      ashita strong 17/3 next+2d
      kinou strong 17/3 next+2d
      ima strong 17/0 next+2d
      ji strong 15/0 next+2d
      fun strong 7/0 next+2d
      shuumatsu strong 4/0 next+7d
      today: due 0 cap 20 | review,recall,kotoba-bubble,fill,quiz"
    `);
  });
});
