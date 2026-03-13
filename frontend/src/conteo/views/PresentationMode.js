import { useState, useEffect, useCallback } from 'react';
import {
  Users, Clock, Camera, TrendingUp, Activity, Target,
  ChevronRight, ChevronLeft, Play, Pause, X
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { AnimNum, BrandLogo, TrendBadge, LiveClock } from '../shared';
import { ALL_BRANDS, BRAND_COLORS } from '../constants';

export function PresentationMode({ data, api, onExit }) {
  const [slide, setSlide] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [trendsData, setTrendsData] = useState(null);

  const {
    today_total = 0, yesterday_total = 0,
    month_total = 0, daily_avg = 0, cameras_total = 0, cameras_online = 0,
    goals_progress = [], month = '',
    comparison_week = {}, comparison_month = {}
  } = data || {};

  useEffect(() => {
    api('get', '/ranking/trends').then(res => setTrendsData(res.data)).catch(() => {});
  }, [api]);

  const totalSlides = 4;

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setSlide(prev => (prev + 1) % totalSlides);
    }, 12000);
    return () => clearInterval(timer);
  }, [playing]);

  const nextSlide = () => setSlide(prev => (prev + 1) % totalSlides);
  const prevSlide = () => setSlide(prev => (prev - 1 + totalSlides) % totalSlides);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape' && onExit) onExit(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onExit]);

  const slideNames = ['Resumen del Dia', 'Comparativa Temporal', 'Objetivos del Mes', 'Tendencias'];

  const hourlyData = (trendsData?.hourly_today || []).filter(h => h.hour <= new Date().getHours());
  const brandHourly = trendsData?.brand_hourly || {};
  const brandKeys = Object.keys(brandHourly);

  const DarkPresentTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'rgba(10,15,30,0.95)', border: '1px solid rgba(91,141,184,0.3)', borderRadius: 10, padding: '10px 14px', backdropFilter: 'blur(10px)' }}>
        <p style={{ color: '#7EB3D6', fontSize: '0.72rem', marginBottom: 3, fontWeight: 600 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color || '#E2E8F0', fontSize: '0.88rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
            {p.name ? `${p.name}: ` : ''}{p.value.toLocaleString('es-ES')}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="pres-mode" data-testid="presentation-mode">
      <div className="pres-bg">
        <div className="pres-orb po1" /><div className="pres-orb po2" /><div className="pres-orb po3" /><div className="pres-orb po4" />
      </div>
      <div className="pres-inner">
        <header className="pres-header">
          <div className="pres-header-left">
            <img src="/dag-logo.png" alt="DAG" className="pres-logo" />
            <div className="pres-sep" />
            <div>
              <h1 className="pres-title">Informe de Visitas</h1>
              <p className="pres-sub">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
          <div className="pres-controls">
            <button className="pres-ctrl-btn" onClick={prevSlide} data-testid="pres-prev"><ChevronLeft size={16} /></button>
            <button className={`pres-ctrl-btn ${playing ? 'active' : ''}`} onClick={() => setPlaying(!playing)} data-testid="pres-play-pause">
              {playing ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button className="pres-ctrl-btn" onClick={nextSlide} data-testid="pres-next"><ChevronRight size={16} /></button>
            <span className="pres-slide-info mono">{slide + 1}/{totalSlides}</span>
          </div>
          <LiveClock />
          {onExit && (
            <button className="pres-ctrl-btn" onClick={onExit} data-testid="pres-exit" title="Salir (ESC)">
              <X size={16} />
            </button>
          )}
        </header>

        <div className="pres-indicators">
          {slideNames.map((name, i) => (
            <button key={i} className={`pres-dot ${slide === i ? 'active' : ''}`} onClick={() => setSlide(i)} data-testid={`pres-slide-${i}`}>
              <span className="pres-dot-label">{name}</span>
              <div className="pres-dot-bar"><div className="pres-dot-fill" style={{ width: slide === i && playing ? '100%' : slide === i ? '100%' : '0%', transition: slide === i && playing ? 'width 12s linear' : 'width 0.3s ease' }} /></div>
            </button>
          ))}
        </div>

        <div className="pres-slide-container">
          {slide === 0 && (
            <div className="pres-slide pres-slide-summary" data-testid="pres-slide-summary">
              <div className="pres-hero-kpi">
                <div className="pres-hero-icon"><Users size={48} /></div>
                <div className="pres-hero-num mono"><AnimNum value={today_total} /></div>
                <div className="pres-hero-label">VISITAS HOY</div>
                <TrendBadge current={today_total} previous={yesterday_total} />
              </div>
              <div className="pres-kpi-row">
                <div className="pres-kpi-box">
                  <Clock size={20} style={{color:'#94A3B8'}} />
                  <span className="pres-kpi-num mono"><AnimNum value={yesterday_total} /></span>
                  <span className="pres-kpi-txt">Ayer</span>
                </div>
                <div className="pres-kpi-box">
                  <TrendingUp size={20} style={{color:'#E8A83E'}} />
                  <span className="pres-kpi-num mono"><AnimNum value={month_total} /></span>
                  <span className="pres-kpi-txt">Este mes</span>
                </div>
                <div className="pres-kpi-box">
                  <Activity size={20} style={{color:'#8B5CF6'}} />
                  <span className="pres-kpi-num mono"><AnimNum value={daily_avg} /></span>
                  <span className="pres-kpi-txt">Media/dia</span>
                </div>
                <div className="pres-kpi-box">
                  <Camera size={20} style={{color:'#22c55e'}} />
                  <span className="pres-kpi-num mono">{cameras_online}/{cameras_total}</span>
                  <span className="pres-kpi-txt">Camaras</span>
                </div>
              </div>
              {hourlyData.length > 1 && (
                <div className="pres-chart-area">
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={hourlyData} margin={{top: 10, right: 20, left: -15, bottom: 0}}>
                      <defs>
                        <linearGradient id="presGrad1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#5B8DB8" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#5B8DB8" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="label" tick={{fontSize:11, fill:'#64748B'}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fontSize:11, fill:'#64748B'}} axisLine={false} tickLine={false} />
                      <Tooltip content={<DarkPresentTooltip />} />
                      <Area type="monotone" dataKey="entries" stroke="#5B8DB8" strokeWidth={3} fill="url(#presGrad1)" dot={false}
                        activeDot={{r:5, fill:'#5B8DB8', stroke:'#0A0F1E', strokeWidth:2}} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {slide === 1 && (
            <div className="pres-slide pres-slide-comparison" data-testid="pres-slide-comparison">
              <h2 className="pres-slide-title">Comparativa Temporal</h2>
              <div className="pres-comp-grid">
                <div className="pres-comp-block">
                  <div className="pres-comp-header">SEMANAL</div>
                  <div className="pres-comp-nums">
                    <div className="pres-comp-main">
                      <span className="pres-comp-big mono"><AnimNum value={comparison_week.current_total || 0} /></span>
                      <span className="pres-comp-lbl">{comparison_week.label_current || 'Esta semana'}</span>
                    </div>
                    <div className="pres-comp-vs-block">
                      <span className="pres-comp-vs-num mono">{(comparison_week.previous_total || 0).toLocaleString('es-ES')}</span>
                      <span className="pres-comp-vs-lbl">{comparison_week.label_previous || 'Anterior'}</span>
                    </div>
                  </div>
                  <div className="pres-comp-trend">
                    <TrendBadge current={comparison_week.current_total || 0} previous={comparison_week.previous_total || 0} />
                  </div>
                </div>
                <div className="pres-comp-block">
                  <div className="pres-comp-header">MENSUAL</div>
                  <div className="pres-comp-nums">
                    <div className="pres-comp-main">
                      <span className="pres-comp-big mono"><AnimNum value={comparison_month.current_total || 0} /></span>
                      <span className="pres-comp-lbl">{comparison_month.label_current || 'Este mes'}</span>
                    </div>
                    <div className="pres-comp-vs-block">
                      <span className="pres-comp-vs-num mono">{(comparison_month.previous_total || 0).toLocaleString('es-ES')}</span>
                      <span className="pres-comp-vs-lbl">{comparison_month.label_previous || 'Anterior'}</span>
                    </div>
                  </div>
                  <div className="pres-comp-trend">
                    <TrendBadge current={comparison_month.current_total || 0} previous={comparison_month.previous_total || 0} />
                  </div>
                </div>
              </div>
              {(comparison_week.brand_comparison || []).length > 0 && (
                <div className="pres-brand-table">
                  <div className="pres-brand-table-header">
                    <span>Marca</span><span>Actual</span><span>Anterior</span><span>Variacion</span>
                  </div>
                  {comparison_week.brand_comparison.slice(0, 6).map(bc => {
                    const brand = ALL_BRANDS.find(b => b.id === bc.brand_id);
                    return (
                      <div key={bc.brand_id} className="pres-brand-table-row">
                        <div className="pres-brand-cell"><BrandLogo brandId={bc.brand_id} size={22} /><span>{brand?.name || bc.brand_id}</span></div>
                        <span className="mono">{bc.current.toLocaleString('es-ES')}</span>
                        <span className="mono" style={{color:'#64748B'}}>{bc.previous.toLocaleString('es-ES')}</span>
                        <TrendBadge current={bc.current} previous={bc.previous} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {slide === 2 && (
            <div className="pres-slide pres-slide-goals" data-testid="pres-slide-goals">
              <h2 className="pres-slide-title">Objetivos del Mes — {month}</h2>
              {goals_progress.length > 0 ? (
                <div className="pres-goals-grid">
                  {goals_progress.map(g => {
                    const brand = ALL_BRANDS.find(b => b.id === g.brand_id);
                    const color = g.pct >= 100 ? '#22c55e' : g.pct >= 60 ? '#E8A83E' : '#ef4444';
                    return (
                      <div key={g.brand_id} className="pres-goal-card" data-testid={`pres-goal-${g.brand_id}`}>
                        <div className="pres-goal-top">
                          <BrandLogo brandId={g.brand_id} size={32} />
                          <span className="pres-goal-name">{brand?.name || g.brand_id}</span>
                          <span className="pres-goal-pct mono" style={{color}}>{g.pct}%</span>
                        </div>
                        <div className="pres-goal-bar-outer">
                          <div className="pres-goal-bar-fill" style={{width: `${Math.min(g.pct, 100)}%`, background: `linear-gradient(90deg, ${color}dd, ${color})`}} />
                        </div>
                        <div className="pres-goal-nums">
                          <span><strong>{g.actual.toLocaleString('es-ES')}</strong> / {g.target.toLocaleString('es-ES')}</span>
                          <span style={{color: g.projected_pct >= 100 ? '#22c55e' : '#E8A83E'}}>
                            Proyeccion: {g.projected.toLocaleString('es-ES')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="pres-empty">
                  <Target size={48} style={{color:'#334155'}} />
                  <p>Sin objetivos definidos para este mes</p>
                  <p style={{fontSize:'0.82rem', color:'#475569'}}>Defina objetivos desde el panel Ejecutivo</p>
                </div>
              )}
            </div>
          )}

          {slide === 3 && (
            <div className="pres-slide pres-slide-trends" data-testid="pres-slide-trends">
              <h2 className="pres-slide-title">Tendencias por Marca</h2>
              {brandKeys.length > 0 && hourlyData.length > 1 ? (
                <>
                  <div className="pres-chart-large">
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart margin={{top: 10, right: 20, left: -15, bottom: 0}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="label" tick={{fontSize:11, fill:'#64748B'}} axisLine={false} tickLine={false}
                          data={hourlyData} />
                        <YAxis tick={{fontSize:11, fill:'#64748B'}} axisLine={false} tickLine={false} />
                        <Tooltip content={<DarkPresentTooltip />} />
                        {brandKeys.map(bid => {
                          const bData = (brandHourly[bid] || []).filter(h => h.hour <= new Date().getHours());
                          return (
                            <Line key={bid} data={bData} dataKey="entries" name={ALL_BRANDS.find(b => b.id === bid)?.name || bid}
                              stroke={BRAND_COLORS[bid] || '#5B8DB8'} strokeWidth={2.5} dot={false}
                              activeDot={{r:4, strokeWidth:2}} />
                          );
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="pres-legend">
                    {brandKeys.map(bid => {
                      const brand = ALL_BRANDS.find(b => b.id === bid);
                      return (
                        <span key={bid} className="pres-legend-item">
                          <span className="pres-legend-dot" style={{background: BRAND_COLORS[bid] || '#5B8DB8'}} />
                          {brand?.name || bid}
                        </span>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="pres-empty">
                  <TrendingUp size={48} style={{color:'#334155'}} />
                  <p>Cargando datos de tendencias...</p>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="pres-footer">
          <span>Domingo Alonso Group</span>
          <div className="pres-footer-center">
            <img src="/siempria-logo.png" alt="" className="pres-foot-logo" />
            <span>Siempria</span>
          </div>
          <span className="pres-footer-conf">Confidencial — Solo uso interno</span>
        </footer>
      </div>
    </div>
  );
}
