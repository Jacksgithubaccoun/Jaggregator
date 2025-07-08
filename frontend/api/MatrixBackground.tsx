import React, { useEffect, useRef } from 'react';

export const MatrixBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const cols = window.innerWidth / 20;
    const ypos = Array(Math.floor(cols)).fill(0);

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const draw = () => {
      if (!ctx) return;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#0F0';
      ctx.font = '20pt monospace';

      ypos.forEach((y, ind) => {
        const text = String.fromCharCode(0x30A0 + Math.random() * 96);
        ctx.fillText(text, ind * 20, y);

        if (y > 100 + Math.random() * 10000) ypos[ind] = 0;
        else ypos[ind] = y + 20;
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    // cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        backgroundColor: 'black',
      }}
      aria-hidden="true"
    />
  );
};
