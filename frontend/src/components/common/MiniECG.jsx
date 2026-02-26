/**
 * MiniECG - Animación ECG pequeña para el header del NOC
 */
import { useEffect, useRef } from 'react';

const MiniECG = ({ color = '#06b6d4', width = 60, height = 20 }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const offsetRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // ECG pattern points (normalized 0-1)
    const ecgPattern = [
      0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5,
      0.5, 0.45, 0.4, 0.3, 0.1, 0.9, 0.2, 0.5,
      0.5, 0.55, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5
    ];

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Draw ECG line
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const patternWidth = width * 0.8;
      const startX = offsetRef.current % patternWidth;

      for (let i = 0; i < ecgPattern.length; i++) {
        const x = (i / ecgPattern.length) * patternWidth - startX;
        const y = ecgPattern[i] * height;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      // Draw second pattern for seamless loop
      for (let i = 0; i < ecgPattern.length; i++) {
        const x = (i / ecgPattern.length) * patternWidth - startX + patternWidth;
        const y = ecgPattern[i] * height;
        ctx.lineTo(x, y);
      }

      ctx.stroke();

      offsetRef.current += 0.8;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [color, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="opacity-80"
    />
  );
};

export default MiniECG;
