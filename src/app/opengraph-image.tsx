import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Kannanao — AI-powered Japanese flashcard studio';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  // Fetch DM Serif Display as TTF by requesting with an older user agent
  // (Google Fonts returns woff2 for modern browsers, TTF for legacy — satori needs TTF)
  const css = await fetch('https://fonts.googleapis.com/css2?family=DM+Serif+Display', {
    headers: {
      'User-Agent': 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1)',
    },
  }).then((r) => r.text());

  const fontUrl = css.match(/url\((.+?)\)/)?.[1];
  const fontData = fontUrl ? await fetch(fontUrl).then((r) => r.arrayBuffer()) : null;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(148deg, #FCE7F3 0%, #F9D5EC 35%, #EDE9FE 70%, #F3E8FF 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Faded dot grid overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(236,72,153,0.1) 1.5px, transparent 1.5px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Decorative background kanji */}
      <div
        style={{
          position: 'absolute',
          fontSize: 560,
          color: '#BE185D',
          opacity: 0.055,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -48%)',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        語
      </div>

      {/* Cherry blossom accent */}
      <div
        style={{
          position: 'absolute',
          top: 52,
          right: 64,
          fontSize: 52,
        }}
      >
        🌸
      </div>

      {/* Bottom-left decorative blossom */}
      <div
        style={{
          position: 'absolute',
          bottom: 48,
          left: 60,
          fontSize: 32,
          opacity: 0.45,
        }}
      >
        🌸
      </div>

      {/* Main content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontSize: 104,
            fontFamily: fontData ? 'DM Serif Display' : 'serif',
            color: '#BE185D',
            letterSpacing: '-2px',
            lineHeight: 1.05,
            marginBottom: 24,
          }}
        >
          Kannanao
        </div>
        <div
          style={{
            fontSize: 30,
            color: '#9D174D',
            fontWeight: 400,
            opacity: 0.72,
            letterSpacing: '0.04em',
            fontFamily: 'sans-serif',
          }}
        >
          AI-powered Japanese flashcard studio
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: fontData
        ? [
            {
              name: 'DM Serif Display',
              data: fontData,
              style: 'normal',
            },
          ]
        : [],
    },
  );
}
