/**
 * DahuaECG - Monitor de uptime para grabadores Dahua
 * Similar al SystemECG pero específico para DVR/NVR
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { HardDrive, Trophy, Clock, Calendar } from 'lucide-react';

const DahuaECG = ({ 
  onlineCount = 0,
  offlineCount = 0,
  totalDevices = 0,
  lastIncidentTime = null, // ISO timestamp of last Dahua device offline
  recordTime = null, // Object { days, hours, minutes, seconds }
  recordDate = null, // ISO timestamp when record was achieved
  authAxios = null,
  onRecordUpdate = null,
  className 
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [pulse, setPulse] = useState(0);
  const [uptimeCounter, setUptimeCounter] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [recordCounter, setRecordCounter] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [recordDateState, setRecordDateState] = useState(null);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const lastSaveAttemptRef = useRef(0);

  // Calculate health percentage
  const healthPercent = totalDevices > 0 ? (onlineCount / totalDevices) * 100 : 100;
  const hasAlerts = offlineCount > 0;

  // Determine color based on health
  const getColor = () => {
    if (healthPercent >= 95) return '#f97316'; // Orange for Dahua
    if (healthPercent >= 80) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  // Determine pulse rate based on health
  const getPulseRate = () => {
    if (healthPercent >= 95) return 60;
    if (healthPercent >= 80) return 80;
    return 100;
  };

  // Load record from server
  useEffect(() => {
    const loadRecord = async () => {
      if (!authAxios) return;
      try {
        const res = await authAxios.get('/dahua/uptime-record');
        if (res.data?.record) {
          setRecordCounter(res.data.record);
          if (res.data.record_date) {
            setRecordDateState(res.data.record_date);
          }
        }
      } catch (error) {
        console.log('No Dahua uptime record found');
      }
    };
    loadRecord();
  }, [authAxios]);

  // Calculate uptime counter
  useEffect(() => {
    const calculateUptime = () => {
      if (!lastIncidentTime) {
        // If no incident, show time since start of day
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

  // Initialize record from props
  useEffect(() => {
    if (recordTime && typeof recordTime === 'object') {
      setRecordCounter({
        days: recordTime.days || 0,
        hours: recordTime.hours || 0,
        minutes: recordTime.minutes || 0,
        seconds: recordTime.seconds || 0
      });
    }
    if (recordDate) {
      setRecordDateState(recordDate);
    }
  }, [recordTime, recordDate]);

  // Check if current uptime exceeds record and save if so
  useEffect(() => {
    if (!authAxios || isSavingRecord) return;
    
    const currentTotalSeconds = uptimeCounter.days * 86400 + uptimeCounter.hours * 3600 + 
                                uptimeCounter.minutes * 60 + uptimeCounter.seconds;
    const recordTotalSeconds = recordCounter.days * 86400 + recordCounter.hours * 3600 + 
                               recordCounter.minutes * 60 + recordCounter.seconds;
    
    const now = Date.now();
    if (currentTotalSeconds > recordTotalSeconds && currentTotalSeconds > 0 && 
        now - lastSaveAttemptRef.current > 60000) {
      lastSaveAttemptRef.current = now;
      
      const saveNewRecord = async () => {
        setIsSavingRecord(true);
        try {
          const newRecordDate = new Date().toISOString();
          await authAxios.post('/dahua/uptime-record', {
            record: uptimeCounter,
            record_date: newRecordDate
          });
          setRecordCounter({ ...uptimeCounter });
          setRecordDateState(newRecordDate);
          if (onRecordUpdate) {
            onRecordUpdate({ ...uptimeCounter }, newRecordDate);
          }
          console.log('New Dahua uptime record saved:', uptimeCounter);
        } catch (error) {
          console.error('Error saving Dahua uptime record:', error);
        } finally {
          setIsSavingRecord(false);
        }
      };
      
      saveNewRecord();
    }
  }, [uptimeCounter, recordCounter, authAxios, isSavingRecord, onRecordUpdate]);

  // ECG Animation
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

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [healthPercent, hasAlerts]);

  const formatNumber = (num) => String(num).padStart(2, '0');
  
  const formatRecordDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

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
          DVR/NVR MONITOR
        </span>
      </div>

      {/* Pulse rate */}
      <div className="absolute top-1 right-3 text-right">
        <span className="text-xl font-bold font-mono" style={{ color: getColor() }}>
          {pulse}
        </span>
        <span className="text-[9px] text-slate-400 ml-1">BPM</span>
      </div>

      {/* Uptime Counter and Record */}
      <div className="border-t border-slate-700/50 bg-slate-950/80 px-2 py-1.5">
        <div className="flex gap-3">
          {/* Current Uptime */}
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <HardDrive className="w-3 h-3 text-orange-400" />
              <span className="text-[8px] text-slate-400 uppercase">Sin incidencias</span>
            </div>
            <div className="font-mono text-sm font-bold tracking-wide" style={{ color: getColor() }}>
              {formatNumber(uptimeCounter.days)}:{formatNumber(uptimeCounter.hours)}:{formatNumber(uptimeCounter.minutes)}:{formatNumber(uptimeCounter.seconds)}
            </div>
          </div>
          
          {/* Separator */}
          <div className="w-px bg-slate-700/50" />
          
          {/* Record */}
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <Trophy className="w-3 h-3 text-amber-400" />
              <span className="text-[8px] text-slate-400 uppercase">Record</span>
            </div>
            <div className="font-mono text-sm font-bold tracking-wide text-amber-400">
              {formatNumber(recordCounter.days)}:{formatNumber(recordCounter.hours)}:{formatNumber(recordCounter.minutes)}:{formatNumber(recordCounter.seconds)}
            </div>
            {/* Record date */}
            {recordDateState && (
              <div className="flex items-center gap-1 mt-0.5">
                <Calendar className="w-2.5 h-2.5 text-slate-500" />
                <span className="text-[7px] text-slate-500">
                  {formatRecordDate(recordDateState)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DahuaECG;
