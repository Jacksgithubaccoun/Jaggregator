// src/components/MatrixRain.tsx
import React, { useEffect, useRef } from 'react';

const MatrixRain: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    canvas.width = width;
    canvas.height = height;

    // Extended character set without wingdings:
    const letters = [
      ...'abcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()_+-=[]{}|;:,.<>?'.split(''),

      // Hiragana (Unicode range 3040–309F)
      ...Array.from({ length: 96 }, (_, i) => String.fromCharCode(0x3040 + i)),

      // Katakana (Unicode range 30A0–30FF)
      ...Array.from({ length: 96 }, (_, i) => String.fromCharCode(0x30A0 + i)),

      // Some common Kanji
      '日','本','語','水','火','金','土','木','人','大','中','小','山','川','田','天',
    ];

    const fontSize = 16;
    const columns = Math.floor(width / fontSize);

    const drops = new Array(columns).fill(1);

    let animationFrameId: number;

    const draw = () => {
      if (!ctx) return;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#0F0';
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = letters[Math.floor(Math.random() * letters.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        drops[i]++;
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;

      const newColumns = Math.floor(width / fontSize);
      drops.length = newColumns;
      for (let i = 0; i < newColumns; i++) {
        if (!drops[i]) drops[i] = 1;
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -10,
        pointerEvents: 'none',
        backgroundColor: 'black',
      }}
    />
  );
};

export default MatrixRain;MatrixRain;

