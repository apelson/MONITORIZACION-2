import { useState, useEffect, useRef } from 'react';
import {
  Clock, RefreshCw, BarChart3, Check, X, Activity, Camera, Wifi, WifiOff,
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import { ISLAND_PNGS, ALL_BRANDS } from './constants';

/* ── ECG Heartbeat ── */
export function EcgMonitor({ camerasOnline, camerasTotal }) {
  const canvasRef = useRef(null);
  const dataRef = useRef([]);
  const offsetRef = useRef(0);

  useEffect(() => {
    dataRef.current.push(camerasOnline);
    if (dataRef.current.length > 60) dataRef.current.shift();
  }, [camerasOnline]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const draw = () => {
      const w = canvas.width = canvas.offsetWidth * 2;
      const h = canvas.height = canvas.offsetHeight * 2;
      ctx.clearRect(0, 0, w, h);

      const pts = dataRef.current;
      const max = Math.max(camerasTotal || 1, ...pts, 1);
      offsetRef.current = (offsetRef.current + 1) % 20;

      ctx.strokeStyle = 'rgba(91,141,184,0.08)';
      ctx.lineWidth = 1;
      for (let y = 0; y < h; y += 24) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      for (let x = -offsetRef.current; x < w; x += 24) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }

      if (pts.length < 2) { animId = requestAnimationFrame(draw); return; }

      const stepX = w / (pts.length - 1);
      ctx.beginPath();
      ctx.strokeStyle = camerasOnline >= camerasTotal ? '#22c55e' : camerasOnline > 0 ? '#f59e0b' : '#ef4444';
      ctx.lineWidth = 3;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 8;
      ctx.lineJoin = 'round';

      pts.forEach((val, i) => {
        const x = i * stepX;
        const baseY = h - (val / max) * (h * 0.7) - h * 0.1;
        let y = baseY;
        if (i > 0 && pts[i] !== pts[i - 1]) {
          const diff = pts[i] - pts[i - 1];
          y = baseY - diff * 4;
        }
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      const lastX = (pts.length - 1) * stepX;
      const lastY = h - (pts[pts.length - 1] / max) * (h * 0.7) - h * 0.1;
      ctx.beginPath();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.shadowBlur = 16;
      ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [camerasOnline, camerasTotal]);

  return <canvas ref={canvasRef} className="ecg-canvas" />;
}

/* ── System Health Widget ── */
export function SystemHealthWidget({ camerasOnline, camerasTotal }) {
  const pct = camerasTotal > 0 ? Math.round((camerasOnline / camerasTotal) * 100) : 0;
  const statusColor = pct >= 90 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const statusLabel = pct >= 90 ? 'OPERATIVO' : pct >= 50 ? 'PARCIAL' : 'CRITICO';
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="noc-health-widget" data-testid="system-health-widget">
      <div className="health-header">
        <Activity size={14} style={{ color: statusColor }} />
        <span className="health-title">ESTADO DEL SISTEMA</span>
        <span className="health-pulse" style={{ background: statusColor }} />
      </div>
      <div className="health-body">
        <div className="health-gauge">
          <svg width="68" height="68" viewBox="0 0 68 68">
            <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
            <circle cx="34" cy="34" r={r} fill="none" stroke={statusColor} strokeWidth="5"
              strokeDasharray={circ} strokeDashoffset={offset}
              strokeLinecap="round" transform="rotate(-90 34 34)"
              style={{ transition: 'stroke-dashoffset 1s ease' }} />
            <text x="34" y="31" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="700" fontFamily="JetBrains Mono, monospace">{pct}%</text>
            <text x="34" y="44" textAnchor="middle" fill={statusColor} fontSize="7" fontWeight="600" letterSpacing="0.5">{statusLabel}</text>
          </svg>
        </div>
        <div className="health-info">
          <div className="health-row">
            <Camera size={12} />
            <span className="health-label">Camaras</span>
            <span className="health-val mono">{camerasOnline}<span style={{opacity:0.4}}>/{camerasTotal}</span></span>
          </div>
          <div className="health-row">
            <Wifi size={12} style={{ color: '#22c55e' }} />
            <span className="health-label">Online</span>
            <span className="health-val mono" style={{ color: '#22c55e' }}>{camerasOnline}</span>
          </div>
          <div className="health-row">
            <WifiOff size={12} style={{ color: '#ef4444' }} />
            <span className="health-label">Offline</span>
            <span className="health-val mono" style={{ color: camerasTotal - camerasOnline > 0 ? '#ef4444' : 'rgba(255,255,255,0.3)' }}>{camerasTotal - camerasOnline}</span>
          </div>
        </div>
      </div>
      <div className="health-ecg">
        <EcgMonitor camerasOnline={camerasOnline} camerasTotal={camerasTotal} />
      </div>
    </div>
  );
}

/* ── Trend Badge ── */
export function TrendBadge({ current, previous }) {
  if (!previous || previous === 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return <span className="trend-badge neutral"><Minus size={10} /> 0%</span>;
  const up = pct > 0;
  return (
    <span className={`trend-badge ${up ? 'up' : 'down'}`}>
      {up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {up ? '+' : ''}{pct}%
    </span>
  );
}

/* ── Mini Sparkline ── */
export function MiniSparkline({ data = [], width = 60, height = 20, color = '#5B8DB8' }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} className="mini-sparkline">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={(data.length - 1) / (data.length - 1) * width} cy={height - ((data[data.length - 1] - min) / range) * (height - 2) - 1}
        r="2" fill={color} />
    </svg>
  );
}

/* ── Brand Logo ── */
export function BrandLogo({ brandId, size = 24 }) {
  const brand = ALL_BRANDS.find(b => b.id === brandId);
  if (!brand) return null;
  return (
    <img
      src={brand.logo} alt={brand.name} className="brand-logo-img"
      style={{ width: size, height: size, borderRadius: size > 30 ? 10 : 6, objectFit: 'contain', background: '#fff', padding: size > 30 ? 3 : 2 }}
      onError={e => { e.target.style.display = 'none'; }}
    />
  );
}

/* ── Island Silhouette ── */
export function IslandSilhouette({ island, size = 44, active = false, color }) {
  const src = ISLAND_PNGS[island];
  if (!src) return null;
  return (
    <img
      src={src} alt={island} className="island-silhouette"
      style={{
        width: size, height: size, objectFit: 'contain',
        filter: active ? `drop-shadow(0 0 8px ${color}90)` : 'brightness(0.3) grayscale(1)',
        transition: 'filter 0.3s'
      }}
    />
  );
}

/* ── Animated Number ── */
export function AnimNum({ value }) {
  const numVal = (typeof value === 'number' && !isNaN(value)) ? value : 0;
  const [display, setDisplay] = useState(numVal);
  const prevRef = useRef(numVal);
  useEffect(() => {
    const from = prevRef.current;
    const to = numVal;
    prevRef.current = to;
    if (from === to) { setDisplay(to); return; }
    const t0 = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min((now - t0) / 700, 1);
      setDisplay(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [numVal]);
  return <span>{display.toLocaleString('es-ES')}</span>;
}

/* ── Live Clock ── */
export function LiveClock({ compact }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (compact) {
    return (
      <div className="header-clock">
        <Clock size={13} />
        <span>{time.toLocaleTimeString('es-ES')}</span>
      </div>
    );
  }
  return (
    <div className="noc-clock">
      <div className="noc-clock-time">
        {time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div className="noc-clock-date">
        {time.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  );
}

/* ── Chip Select ── */
export function ChipSelect({ label, options, selected, onChange, testId }) {
  return (
    <div className="chip-select-group" data-testid={testId}>
      <label className="chip-select-label">{label}</label>
      <div className="chip-select-desc">Vacio = acceso a todo</div>
      <div className="chip-select-wrap">
        {options.map(opt => {
          const isOn = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              className={`chip-option ${isOn ? 'chip-on' : ''}`}
              onClick={() => {
                if (isOn) onChange(selected.filter(s => s !== opt.id));
                else onChange([...selected, opt.id]);
              }}
              data-testid={`chip-${opt.id}`}
            >
              {opt.logo && <img src={opt.logo} alt="" style={{ width: 16, height: 16, borderRadius: 3, objectFit: 'cover' }} />}
              <span>{opt.name}</span>
              {isOn && <Check size={12} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Shared UI ── */
export function EmptyState({ text }) {
  return <div className="empty-box" data-testid="empty-state"><BarChart3 size={32} /><p>{text}</p></div>;
}

export function LoadingState() {
  return <div className="loading-box"><RefreshCw size={28} className="spin" /><p>Cargando datos...</p></div>;
}

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-bg" onClick={onClose} data-testid="modal-overlay">
      <div className={`modal-box ${wide ? 'modal-wide' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="modal-top">
          <h3>{title}</h3>
          <button onClick={onClose} data-testid="modal-close"><X size={18} /></button>
        </div>
        <div className="modal-inner">{children}</div>
      </div>
    </div>
  );
}

export function FormField({ label, value, onChange, placeholder, disabled, type = 'text', testId }) {
  return (
    <div className="form-field">
      <label>{label}</label>
      <input data-testid={testId} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} />
    </div>
  );
}

export function FormSelect({ label, value, onChange, options, testId }) {
  return (
    <div className="form-field">
      <label>{label}</label>
      <select data-testid={testId} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Seleccionar...</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
