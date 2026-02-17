/**
 * System ECG Component
 * Animated ECG/heartbeat line showing real-time system health
 */
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Shield, Trophy, Clock } from 'lucide-react';

const SystemECG = ({ 
  healthPercent = 100, 
  hasAlerts = false,
  isAnalyzing = true,
  lastIncidentTime = null, // ISO timestamp of last incident
  recordTime = null, // Object { days, hours, minutes, seconds } for record
  recordDate = null, // ISO timestamp when record was achieved
  authAxios = null, // For saving new records
  onRecordUpdate = null, // Callback when record is updated
  className 
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [pulse, setPulse] = useState(0);
  const [uptimeCounter, setUptimeCounter] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [recordCounter, setRecordCounter] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const lastSaveAttemptRef = useRef(0);

  // Determine color based on health
  const getColor = () => {
    if (healthPercent >= 95) return '#10b981'; // Emerald
    if (healthPercent >= 80) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  // Determine pulse rate based on health
  const getPulseRate = () => {
    if (healthPercent >= 95) return 60;
    if (healthPercent >= 80) return 80;
    return 100;
  };

  // Calculate uptime counter
  useEffect(() => {
    const calculateUptime = () => {
      if (!lastIncidentTime) {
        // If no incident, show time since start of day or a default
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const diff = now - startOfDay;
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setUptimeCounter({ days: 0, hours, minutes, seconds });
        return;
      }

      const now = new Date();
      const incident = new Date(lastIncidentTime);
      const diff = now - incident;

      if (diff < 0) {
        setUptimeCounter({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setUptimeCounter({ days, hours, minutes, seconds });
    };

    calculateUptime();
    const interval = setInterval(calculateUptime, 1000);
    return () => clearInterval(interval);
  }, [lastIncidentTime]);

  // Calculate record counter - use recordTime object directly
  useEffect(() => {
    if (!recordTime) {
      setRecordCounter({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    // recordTime is an object with days/hours/minutes/seconds
    if (typeof recordTime === 'object' && recordTime.days !== undefined) {
      setRecordCounter({
        days: recordTime.days || 0,
        hours: recordTime.hours || 0,
        minutes: recordTime.minutes || 0,
        seconds: recordTime.seconds || 0
      });
    }
  }, [recordTime]);

  // Check if current uptime exceeds record and save if so
  useEffect(() => {
    if (!authAxios || isSavingRecord) return;
    
    const currentTotalSeconds = uptimeCounter.days * 86400 + uptimeCounter.hours * 3600 + 
                                uptimeCounter.minutes * 60 + uptimeCounter.seconds;
    const recordTotalSeconds = recordCounter.days * 86400 + recordCounter.hours * 3600 + 
                               recordCounter.minutes * 60 + recordCounter.seconds;
    
    // Only save if current is greater than record and we haven't saved recently (avoid spam)
    const now = Date.now();
    if (currentTotalSeconds > recordTotalSeconds && currentTotalSeconds > 0 && 
        now - lastSaveAttemptRef.current > 60000) { // At most once per minute
      lastSaveAttemptRef.current = now;
      
      const saveNewRecord = async () => {
        setIsSavingRecord(true);
        try {
          await authAxios.post('/uptime-record', uptimeCounter);
          // Update the record counter to match current uptime
          setRecordCounter({ ...uptimeCounter });
          if (onRecordUpdate) {
            onRecordUpdate({ ...uptimeCounter });
          }
          console.log('New uptime record saved:', uptimeCounter);
        } catch (error) {
          console.error('Error saving uptime record:', error);
        } finally {
          setIsSavingRecord(false);
        }
      };
      
      saveNewRecord();
    }
  }, [uptimeCounter, recordCounter, authAxios, isSavingRecord, onRecordUpdate]);

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
    
    const generateECGBeat = (progress) => {
      if (progress < 0.1) return 0;
      if (progress < 0.15) return -0.1;
      if (progress < 0.2) return 0.05;
      if (progress < 0.25) return -0.3;
      if (progress < 0.3) return 0;
      if (progress < 0.35) return 0.1;
      if (progress < 0.4) return 0.9;
      if (progress < 0.45) return -0.4;
      if (progress < 0.5) return 0;
      if (progress < 0.6) return 0.15;
      if (progress < 0.7) return 0.05;
      return 0;
    };

    const addNoise = () => (Math.random() - 0.5) * 2;

    const animate = () => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.1)';
      ctx.fillRect(0, 0, width, height);

      const beatDuration = 60000 / pulseRate;
      const now = Date.now();
      const beatProgress = (now % beatDuration) / beatDuration;

      const ecgValue = generateECGBeat(beatProgress);
      const amplitude = height * 0.35;
      const baseY = height / 2;
      let y = baseY - (ecgValue * amplitude);
      
      y += addNoise();

      if (hasAlerts && beatProgress > 0.7 && beatProgress < 0.8) {
        y -= amplitude * 0.3;
      }

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.moveTo(x - 2, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();

      lastY = y;
      x += 2;

      if (x > width) {
        x = 0;
        ctx.fillStyle = 'rgba(15, 23, 42, 1)';
        ctx.fillRect(0, 0, width, height);
      }

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

  const formatNumber = (num) => String(num).padStart(2, '0');

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
        height={80}
        className="w-full h-20"
      />

      {/* Overlay info */}
      <div className="absolute top-1 left-3 flex items-center gap-2">
        <div 
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: getColor() }}
        />
        <span className="text-[9px] font-mono" style={{ color: getColor() }}>
          SYSTEM MONITOR
        </span>
      </div>

      {/* Pulse rate */}
      <div className="absolute top-1 right-3 text-right">
        <span className="text-xl font-bold font-mono" style={{ color: getColor() }}>
          {pulse}
        </span>
        <span className="text-[9px] text-slate-400 ml-1">BPM</span>
      </div>

      {/* Uptime Counter and Record - Side by Side */}
      <div className="border-t border-slate-700/50 bg-slate-950/80 px-2 py-1.5">
        <div className="flex gap-3">
          {/* Current Uptime */}
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span className="text-[8px] text-slate-400 uppercase">Sin incidencias</span>
            </div>
            
            {/* Counter Display - Compact */}
            <div className="flex items-center justify-center gap-0.5">
              <div className="flex flex-col items-center">
                <div className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5">
                  <span className="text-sm font-bold font-mono text-emerald-400">
                    {formatNumber(uptimeCounter.days)}
                  </span>
                </div>
                <span className="text-[5px] text-slate-500">DÍAS</span>
              </div>
              
              <span className="text-emerald-400 text-xs font-bold">:</span>
              
              <div className="flex flex-col items-center">
                <div className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5">
                  <span className="text-sm font-bold font-mono text-emerald-400">
                    {formatNumber(uptimeCounter.hours)}
                  </span>
                </div>
                <span className="text-[5px] text-slate-500">HRS</span>
              </div>
              
              <span className="text-emerald-400 text-xs font-bold">:</span>
              
              <div className="flex flex-col items-center">
                <div className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5">
                  <span className="text-sm font-bold font-mono text-cyan-400">
                    {formatNumber(uptimeCounter.minutes)}
                  </span>
                </div>
                <span className="text-[5px] text-slate-500">MIN</span>
              </div>
              
              <span className="text-cyan-400 text-xs font-bold">:</span>
              
              <div className="flex flex-col items-center">
                <div className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5">
                  <span className="text-sm font-bold font-mono text-cyan-400 animate-pulse">
                    {formatNumber(uptimeCounter.seconds)}
                  </span>
                </div>
                <span className="text-[5px] text-slate-500">SEG</span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px bg-slate-700/50" />

          {/* Record */}
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <Trophy className="w-3 h-3 text-amber-400" />
              <span className="text-[8px] text-amber-400 uppercase font-semibold">RECORD</span>
            </div>
            
            {/* Record Counter Display */}
            <div className="flex items-center justify-center gap-0.5">
              <div className="flex flex-col items-center">
                <div className="bg-amber-900/30 border border-amber-700/50 rounded px-1 py-0.5">
                  <span className="text-sm font-bold font-mono text-amber-400">
                    {formatNumber(recordCounter.days)}
                  </span>
                </div>
                <span className="text-[5px] text-slate-500">DÍAS</span>
              </div>
              
              <span className="text-amber-400 text-xs font-bold">:</span>
              
              <div className="flex flex-col items-center">
                <div className="bg-amber-900/30 border border-amber-700/50 rounded px-1 py-0.5">
                  <span className="text-sm font-bold font-mono text-amber-400">
                    {formatNumber(recordCounter.hours)}
                  </span>
                </div>
                <span className="text-[5px] text-slate-500">HRS</span>
              </div>
              
              <span className="text-amber-400 text-xs font-bold">:</span>
              
              <div className="flex flex-col items-center">
                <div className="bg-amber-900/30 border border-amber-700/50 rounded px-1 py-0.5">
                  <span className="text-sm font-bold font-mono text-amber-400">
                    {formatNumber(recordCounter.minutes)}
                  </span>
                </div>
                <span className="text-[5px] text-slate-500">MIN</span>
              </div>
              
              <span className="text-amber-400 text-xs font-bold">:</span>
              
              <div className="flex flex-col items-center">
                <div className="bg-amber-900/30 border border-amber-700/50 rounded px-1 py-0.5">
                  <span className="text-sm font-bold font-mono text-amber-400">
                    {formatNumber(recordCounter.seconds)}
                  </span>
                </div>
                <span className="text-[5px] text-slate-500">SEG</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status indicator */}
      <div className="absolute top-1 left-1/2 -translate-x-1/2">
        <span 
          className={cn(
            "text-[8px] font-mono px-2 py-0.5 rounded",
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
