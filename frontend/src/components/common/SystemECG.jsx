/**
 * System ECG Component
 * Animated ECG/heartbeat line showing real-time system health
 */
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const SystemECG = ({ 
  healthPercent = 100, 
  hasAlerts = false,
  isAnalyzing = true,
  className 
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [pulse, setPulse] = useState(0);

  // Determine color based on health
  const getColor = () => {
    if (healthPercent >= 95) return '#10b981'; // Emerald
    if (healthPercent >= 80) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  // Determine pulse rate based on health (lower health = faster pulse = more stress)
  const getPulseRate = () => {
    if (healthPercent >= 95) return 60; // Normal
    if (healthPercent >= 80) return 80; // Elevated
    return 100; // Critical
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    let x = 0;
    let lastY = height / 2;
    const color = getColor();
    const pulseRate = getPulseRate();
    
    // ECG waveform points (normalized)
    const generateECGBeat = (progress) => {
      // Simulate QRS complex of ECG
      if (progress < 0.1) return 0;
      if (progress < 0.15) return -0.1;
      if (progress < 0.2) return 0.05;
      if (progress < 0.25) return -0.3; // P wave
      if (progress < 0.3) return 0;
      if (progress < 0.35) return 0.1; // Q
      if (progress < 0.4) return 0.9; // R peak
      if (progress < 0.45) return -0.4; // S
      if (progress < 0.5) return 0;
      if (progress < 0.6) return 0.15; // T wave
      if (progress < 0.7) return 0.05;
      return 0;
    };

    // Add noise for realism
    const addNoise = () => (Math.random() - 0.5) * 2;

    const animate = () => {
      // Clear with trail effect
      ctx.fillStyle = 'rgba(15, 23, 42, 0.1)';
      ctx.fillRect(0, 0, width, height);

      // Calculate beat progress
      const beatDuration = 60000 / pulseRate; // ms per beat
      const now = Date.now();
      const beatProgress = (now % beatDuration) / beatDuration;

      // Calculate Y position
      const ecgValue = generateECGBeat(beatProgress);
      const amplitude = height * 0.35;
      const baseY = height / 2;
      let y = baseY - (ecgValue * amplitude);
      
      // Add subtle noise
      y += addNoise();

      // Add extra spike if there are alerts
      if (hasAlerts && beatProgress > 0.7 && beatProgress < 0.8) {
        y -= amplitude * 0.3;
      }

      // Draw line segment
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.moveTo(x - 2, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();

      // Draw glow dot at current position
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();

      lastY = y;
      x += 2;

      // Reset when reaching end
      if (x > width) {
        x = 0;
        ctx.fillStyle = 'rgba(15, 23, 42, 1)';
        ctx.fillRect(0, 0, width, height);
      }

      // Update pulse counter
      if (beatProgress < 0.05) {
        setPulse(pulseRate);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    if (isAnalyzing) {
      animate();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [healthPercent, hasAlerts, isAnalyzing]);

  return (
    <div className={cn("relative", className)}>
      {/* Grid background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, ${getColor()}20 1px, transparent 1px),
            linear-gradient(to bottom, ${getColor()}20 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />
      
      {/* ECG Canvas */}
      <canvas 
        ref={canvasRef}
        width={400}
        height={120}
        className="w-full h-full"
      />

      {/* Overlay info */}
      <div className="absolute top-2 left-3 flex items-center gap-2">
        <div 
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: getColor() }}
        />
        <span className="text-[10px] font-mono" style={{ color: getColor() }}>
          SYSTEM MONITOR
        </span>
      </div>

      {/* Pulse rate */}
      <div className="absolute top-2 right-3 text-right">
        <span className="text-2xl font-bold font-mono" style={{ color: getColor() }}>
          {pulse}
        </span>
        <span className="text-[10px] text-slate-400 ml-1">BPM</span>
      </div>

      {/* Health indicator */}
      <div className="absolute bottom-2 left-3">
        <span className="text-[10px] text-slate-400">HEALTH:</span>
        <span className="text-sm font-bold ml-1" style={{ color: getColor() }}>
          {healthPercent}%
        </span>
      </div>

      {/* Status */}
      <div className="absolute bottom-2 right-3">
        <span 
          className={cn(
            "text-[10px] font-mono px-2 py-0.5 rounded",
            healthPercent >= 95 ? "bg-emerald-500/20 text-emerald-400" :
            healthPercent >= 80 ? "bg-amber-500/20 text-amber-400" :
            "bg-red-500/20 text-red-400 animate-pulse"
          )}
        >
          {healthPercent >= 95 ? "STABLE" : healthPercent >= 80 ? "ELEVATED" : "CRITICAL"}
        </span>
      </div>
    </div>
  );
};

export default SystemECG;
