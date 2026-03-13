import { useState, useEffect } from 'react';
import {
  RefreshCw, Trophy, BarChart3, Camera, MapPin, Crown, X,
  Wifi, WifiOff, Flame, Zap, TrendingUp, Activity, Award, Users, Database
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { AnimNum, BrandLogo, IslandSilhouette, LiveClock, SystemHealthWidget, TrendBadge } from '../shared';
import { ALL_BRANDS, ALL_ISLANDS, BRAND_COLORS } from '../constants';

/* ── Podium ── */
function Podium({ ranking, dark }) {
  const medals = [
    { accent: '#E8A83E', bg: 'rgba(232,168,62,0.08)', border: 'rgba(232,168,62,0.25)', label: '1er' },
    { accent: '#94A3B8', bg: 'rgba(148,163,184,0.06)', border: 'rgba(148,163,184,0.18)', label: '2do' },
    { accent: '#CD7F32', bg: 'rgba(205,127,50,0.06)', border: 'rgba(205,127,50,0.18)', label: '3er' },
  ];
  const top3 = ranking.slice(0, 3);
  if (top3.length === 0) return <div className="noc-empty"><Trophy size={32} /><p>Esperando datos...</p></div>;

  return (
    <div className="podium-cards">
      {top3.map((item, i) => {
        const m = medals[i];
        return (
          <div key={item.brand_id} className={`podium-card ${i === 0 ? 'podium-leader' : ''}`}
            style={{ background: m.bg, borderColor: m.border }}
            data-testid={`podium-rank-${i + 1}`}>
            <div className="podium-card-accent" style={{ background: m.accent }} />
            <div className="podium-card-rank" style={{ color: m.accent }}>{m.label}</div>
            <div className="podium-card-logo">
              <BrandLogo brandId={item.brand_id} size={i === 0 ? 44 : 36} />
            </div>
            <div className="podium-card-info">
              <span className="podium-card-name" style={!dark ? { color: '#1A2332' } : undefined}>{item.brand_name}</span>
              <span className="podium-card-count mono" style={{ color: m.accent }}>
                <AnimNum value={item.entries || 0} />
                <span className="podium-card-unit">visitas</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── RankingRows ── */
function RankingRows({ ranking, maxV, light }) {
  if (ranking.length === 0) {
    return <div className="noc-empty"><Trophy size={32} /><p>Esperando datos de camaras...</p></div>;
  }
  return (
    <div className="noc-rank-rows">
      {ranking.slice(0, 8).map((item, i) => (
        <div key={item.brand_id} className={`noc-rank-row ${i === 0 ? 'leader' : ''}`} data-testid={`noc-rank-${item.brand_id}`}>
          <span className={`noc-rk-pos p-${i + 1}`}>{i + 1}</span>
          <div className="noc-rk-logo"><BrandLogo brandId={item.brand_id} size={28} /></div>
          <span className="noc-rk-name" style={light ? { color: '#1A2332' } : undefined}>{item.brand_name}</span>
          <div className="noc-rk-bar-bg" style={light ? { background: '#E2E6EC' } : undefined}>
            <div className="noc-rk-bar" style={{ width: `${((item.entries || 0) / maxV) * 100}%`, background: i === 0 ? '#E8A83E' : '#5B8DB8' }} />
          </div>
          <span className={`noc-rk-val mono ${i === 0 ? 'gold' : ''}`} style={light ? { color: i === 0 ? '#C49030' : '#1A2332' } : undefined}>
            <AnimNum value={item.entries || 0} />
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── IslandCards ── */
function IslandCards({ islandStats, maxI, leaderI, light }) {
  return (
    <div className="noc-islands">
      {ALL_ISLANDS.map(island => {
        const stats = islandStats[island.id] || { total: 0 };
        const isLdr = leaderI && leaderI[0] === island.id && stats.total > 0;
        return (
          <div
            key={island.id}
            className={`noc-island ${isLdr ? 'island-leader' : ''} ${stats.total === 0 ? 'island-zero' : ''}`}
            style={light ? { background: '#F5F7FA', border: '1px solid #E2E6EC' } : undefined}
            data-testid={`island-${island.id}`}
          >
            {isLdr && <Crown size={14} className="island-crown-ico" />}
            <div className="island-visual">
              <IslandSilhouette island={island.id} size={48} active={stats.total > 0} color={island.color} />
              <div className="island-badge" style={{ background: island.color }}>{island.short}</div>
            </div>
            <div className="island-data">
              <span className="island-name" style={light ? { color: '#1A2332' } : undefined}>{island.name}</span>
              <span className={`island-total mono ${isLdr ? 'gold' : ''}`} style={light ? { color: '#1A2332' } : undefined}>
                <AnimNum value={stats.total || 0} />
              </span>
            </div>
            <div className="island-bar-bg" style={light ? { background: '#E2E6EC' } : undefined}>
              <div className="island-bar" style={{ width: `${maxI > 0 ? (stats.total / maxI) * 100 : 0}%`, background: island.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── DealershipRows ── */
function DealershipRows({ dealerships, light }) {
  if (!dealerships || dealerships.length === 0) {
    return <div className={`noc-empty ${light ? 'light' : ''}`}><Camera size={24} /><p>Sin datos de concesionarios</p></div>;
  }
  const maxD = dealerships[0]?.entries || 1;
  return (
    <div className="noc-dealer-rows" data-testid="dealership-ranking">
      {dealerships.slice(0, 10).map((d, i) => (
        <div key={d.camera_id} className={`noc-dealer-row ${i === 0 ? 'leader' : ''}`} data-testid={`dealer-row-${d.camera_id}`}>
          <span className={`noc-dl-pos ${i < 3 ? `p-${i + 1}` : ''}`}>{i + 1}</span>
          <div className="noc-dl-logo"><BrandLogo brandId={d.brand_id} size={22} /></div>
          <div className="noc-dl-info">
            <span className="noc-dl-name" style={light ? { color: '#1A2332' } : undefined}>{d.camera_name || d.camera_id}</span>
            <span className="noc-dl-brand" style={light ? { color: '#94A0B0' } : undefined}>{d.brand_name}</span>
          </div>
          <div className="noc-dl-bar-bg" style={light ? { background: '#E2E6EC' } : undefined}>
            <div className="noc-dl-bar" style={{ width: `${((d.entries || 0) / maxD) * 100}%`, background: BRAND_COLORS[d.brand_id] || '#5B8DB8' }} />
          </div>
          <span className={`noc-dl-val mono ${i === 0 ? 'gold' : ''}`} style={light ? { color: i === 0 ? '#C49030' : '#1A2332' } : undefined}>
            <AnimNum value={d.entries || 0} />
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── NOC Historical View ── */
function NOCHistorico({ trendsData, historicalData, ranking }) {
  const currentHour = new Date().getHours();
  const { hourly_today = [], daily_week = [], brand_hourly = {} } = trendsData || {};

  const totalToday = historicalData?.today_total || hourly_today.reduce((s, h) => s + h.entries, 0);
  const peakHour = hourly_today.reduce((max, h) => h.entries > (max?.entries || 0) ? h : max, hourly_today[0]);
  const avgHourly = currentHour > 0 ? Math.round(totalToday / currentHour) : 0;
  const chartHourly = (historicalData?.today_hourly?.length > 0 ? historicalData.today_hourly : hourly_today).filter(h => h.hour <= currentHour);
  const brandKeys = Object.keys(brand_hourly);

  const yesterdayTotal = historicalData?.yesterday_total || 0;
  const readingsStored = historicalData?.readings_stored || 0;
  const dailySeries = historicalData?.daily_series || daily_week;

  const DarkTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px' }}>
        <p style={{ color: '#94A3B8', fontSize: '0.72rem', marginBottom: 2 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color || '#E2E8F0', fontSize: '0.82rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
            {p.name ? `${p.name}: ` : ''}{p.value.toLocaleString('es-ES')} visitas
          </p>
        ))}
      </div>
    );
  };

  if (!trendsData) return (
    <div className="noc-historico-loading">
      <RefreshCw size={24} className="spin" style={{ color: '#5B8DB8' }} />
      <p style={{ color: '#94A3B8', marginTop: '0.75rem' }}>Cargando datos historicos...</p>
    </div>
  );

  return (
    <div className="noc-historico" data-testid="noc-historico">
      <div className="noc-hist-kpis">
        <div className="noc-hist-kpi">
          <Users size={16} style={{ color: '#5B8DB8' }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="noc-hist-kpi-val mono"><AnimNum value={totalToday} /></span>
              <TrendBadge current={totalToday} previous={yesterdayTotal} />
            </div>
            <span className="noc-hist-kpi-label">Total hoy</span>
          </div>
        </div>
        <div className="noc-hist-kpi">
          <TrendingUp size={16} style={{ color: '#E8A83E' }} />
          <div>
            <span className="noc-hist-kpi-val mono">{peakHour ? `${peakHour.hour}:00` : '--'}</span>
            <span className="noc-hist-kpi-label">Hora pico ({peakHour?.entries || 0})</span>
          </div>
        </div>
        <div className="noc-hist-kpi">
          <Activity size={16} style={{ color: '#8B5CF6' }} />
          <div>
            <span className="noc-hist-kpi-val mono"><AnimNum value={avgHourly} /></span>
            <span className="noc-hist-kpi-label">Media/hora</span>
          </div>
        </div>
        <div className="noc-hist-kpi">
          <Database size={16} style={{ color: '#22c55e' }} />
          <div>
            <span className="noc-hist-kpi-val mono">{readingsStored.toLocaleString('es-ES')}</span>
            <span className="noc-hist-kpi-label">Lecturas almacenadas</span>
          </div>
        </div>
      </div>

      <div className="noc-hist-charts">
        <div className="noc-panel noc-hist-chart-panel">
          <div className="noc-panel-title"><TrendingUp size={16} style={{ color: '#5B8DB8' }} /> FLUJO HORARIO — HOY vs AYER</div>
          <div style={{ width: '100%', height: 220, minWidth: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartHourly} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="nocGradBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5B8DB8" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#5B8DB8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                {(historicalData?.yesterday_hourly || []).length > 0 && (
                  <Area type="monotone" data={historicalData.yesterday_hourly} dataKey="entries" name="Ayer"
                    stroke="#64748B" strokeWidth={1.5} strokeDasharray="4 4" fill="none" dot={false} />
                )}
                <Area type="monotone" dataKey="entries" name="Hoy" stroke="#5B8DB8" strokeWidth={2.5} fill="url(#nocGradBlue)" dot={false}
                  activeDot={{ r: 4, fill: '#5B8DB8', stroke: '#0F172A', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="noc-panel noc-hist-chart-panel">
          <div className="noc-panel-title"><BarChart3 size={16} style={{ color: '#E8A83E' }} /> VISITAS POR DIA — SEMANA</div>
          <div style={{ width: '100%', height: 220, minWidth: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySeries} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="entries" name="Visitas" fill="#E8A83E" radius={[4, 4, 0, 0]} maxBarSize={40} fillOpacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {brandKeys.length > 0 && (
          <div className="noc-panel noc-hist-chart-panel noc-hist-chart-wide">
            <div className="noc-panel-title"><Flame size={16} style={{ color: '#ef4444' }} /> COMPARATIVA POR MARCA</div>
            <div style={{ width: '100%', height: 220, minWidth: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false}
                    data={hourly_today.filter(h => h.hour <= currentHour)} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  {brandKeys.map(bid => {
                    const brand = ALL_BRANDS.find(b => b.id === bid);
                    const bData = (brand_hourly[bid] || []).filter(h => h.hour <= currentHour);
                    return (
                      <Line key={bid} data={bData} dataKey="entries" name={brand?.name || bid}
                        stroke={BRAND_COLORS[bid] || '#5B8DB8'} strokeWidth={2.5} dot={false} />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="noc-hist-legend">
              {brandKeys.map(bid => {
                const brand = ALL_BRANDS.find(b => b.id === bid);
                return (
                  <span key={bid} className="noc-hist-legend-item">
                    <span className="noc-hist-legend-dot" style={{ background: BRAND_COLORS[bid] || '#5B8DB8' }} />
                    {brand?.name || bid}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main NOC View ── */
export function NOCView({ data, islandData: parentIslandData, embedded, onClose, onRefresh, loading, autoRefresh, setAutoRefresh, api }) {
  const islandStats = parentIslandData || {};
  const camerasTotal = data?.cameras_total || 0;
  const camerasOnline = data?.cameras_online || 0;
  const [nocTab, setNocTab] = useState('ranking');
  const [trendsData, setTrendsData] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [autoRotate, setAutoRotate] = useState(false);

  useEffect(() => {
    if (!autoRotate) return;
    const interval = setInterval(() => {
      setNocTab(prev => prev === 'ranking' ? 'historico' : 'ranking');
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRotate]);

  const ranking = (data?.ranking || []).sort((a, b) => (b.entries || 0) - (a.entries || 0));
  const totalVisits = ranking.reduce((s, i) => s + (i.entries || 0), 0);
  const maxV = ranking[0]?.entries || 1;
  const maxI = Math.max(...Object.values(islandStats).map(i => i.total || 0), 1);
  const leaderI = Object.entries(islandStats).sort((a, b) => (b[1].total || 0) - (a[1].total || 0))[0];

  useEffect(() => {
    if (nocTab === 'historico' && !trendsData) {
      api('get', '/ranking/trends').then(res => setTrendsData(res)).catch(() => {});
    }
    if (nocTab === 'historico' && !historicalData) {
      api('get', '/ranking/historical?days=7').then(res => setHistoricalData(res)).catch(() => {});
    }
  }, [nocTab, trendsData, historicalData, api]);

  const dealerships = ranking.flatMap(brand =>
    (brand.cameras || []).map(cam => ({
      ...cam,
      brand_id: brand.brand_id,
      brand_name: brand.brand_name,
    }))
  ).sort((a, b) => (b.entries || 0) - (a.entries || 0));

  if (embedded) {
    return (
      <div className="view-wrap" data-testid="noc-competitivo">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="card">
              <h2 className="card-title"><Award size={18} /> Podio de Honor</h2>
              <Podium ranking={ranking} />
            </div>
            {dealerships.length > 0 && (
              <div className="card">
                <h2 className="card-title"><Camera size={18} /> Ranking Concesionarios</h2>
                <DealershipRows dealerships={dealerships} light />
              </div>
            )}
            <div className="card">
              <h2 className="card-title"><BarChart3 size={18} /> Ranking Completo</h2>
              <RankingRows ranking={ranking} maxV={maxV} light />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 className="card-title" style={{ margin: 0 }}><MapPin size={18} /> Islas Canarias</h2>
            <IslandCards islandStats={islandStats} maxI={maxI} leaderI={leaderI} light />
            <div className="card" style={{ background: '#E8F1F8', textAlign: 'center', padding: '1rem', border: '1px solid #B8D4E8' }}>
              <span className="noc-sum-label" style={{ color: '#3A6A94' }}>Total Archipielago</span>
              <span className="noc-sum-val mono" style={{ color: '#4A7CA7' }}><AnimNum value={totalVisits} /></span>
              <span className="noc-sum-sub" style={{ color: '#3A6A94' }}>visitas hoy</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="noc-full" data-testid="noc-competitivo">
      <div className="noc-bg">
        <div className="noc-orb o1" /><div className="noc-orb o2" /><div className="noc-orb o3" />
      </div>
      <div className="noc-inner">
        <header className="noc-header">
          <div className="noc-header-left">
            <img src="/dag-logo.png" alt="DAG" className="noc-dag-logo" />
            <div className="noc-sep" />
            <div className="noc-header-title-group">
              <h1 className="noc-title">NOC Competitivo <Flame size={18} className="noc-flame" /></h1>
              <p className="noc-subtitle-text">Ranking en tiempo real — Domingo Alonso Group</p>
            </div>
          </div>
          <LiveClock />
          <div className="noc-header-right">
            <div className="noc-tab-toggle" data-testid="noc-tab-toggle">
              <button className={`noc-tab-btn ${nocTab === 'ranking' ? 'active' : ''}`} onClick={() => setNocTab('ranking')} data-testid="noc-tab-ranking">
                <Trophy size={13} /> Ranking
              </button>
              <button className={`noc-tab-btn ${nocTab === 'historico' ? 'active' : ''}`} onClick={() => setNocTab('historico')} data-testid="noc-tab-historico">
                <TrendingUp size={13} /> Historico
              </button>
            </div>
            <button className={`noc-ctrl-btn ${autoRotate ? 'active' : ''}`} onClick={() => setAutoRotate(!autoRotate)} data-testid="noc-auto-rotate" title="Auto-rotacion 30s">
              <Zap size={14} />
              <span>{autoRotate ? 'Auto' : 'Manual'}</span>
            </button>
            <div className="noc-total-box">
              <span className="noc-total-label">TOTAL VISITAS HOY</span>
              <span className="noc-total-num mono"><AnimNum value={totalVisits} /></span>
            </div>
            <button className={`noc-ctrl-btn ${autoRefresh ? 'active' : ''}`} onClick={() => setAutoRefresh(!autoRefresh)} data-testid="noc-auto-refresh">
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>{autoRefresh ? '30s' : 'Off'}</span>
            </button>
            {onClose && <button className="noc-close-btn" onClick={onClose} data-testid="noc-close"><X size={20} /></button>}
          </div>
        </header>

        <div className="noc-body-55">
          {nocTab === 'ranking' ? (
            <>
              <div className="noc-left-area">
                <div className="noc-panel noc-podium-panel">
                  <div className="noc-panel-title"><Award size={16} className="gold-icon" /> PODIO DE HONOR</div>
                  <Podium ranking={ranking} dark />
                </div>
                <div className="noc-left-cols">
                  <div className="noc-panel" style={{ flex: 1 }}>
                    <div className="noc-panel-title"><BarChart3 size={16} /> RANKING EN VIVO</div>
                    <RankingRows ranking={ranking} maxV={maxV} />
                  </div>
                  {dealerships.length > 0 && (
                    <div className="noc-panel" style={{ flex: 1 }}>
                      <div className="noc-panel-title"><Camera size={16} /> CONCESIONARIOS</div>
                      <DealershipRows dealerships={dealerships} />
                    </div>
                  )}
                </div>
              </div>

              <div className="noc-right-area">
                <div className="noc-panel-title"><MapPin size={16} className="purple-icon" /> ISLAS CANARIAS</div>
                <IslandCards islandStats={islandStats} maxI={maxI} leaderI={leaderI} />
                <SystemHealthWidget camerasOnline={camerasOnline} camerasTotal={camerasTotal} />
                <div className="noc-summary-panel">
                  <span className="noc-sum-label">TOTAL ARCHIPIELAGO</span>
                  <span className="noc-sum-val mono"><AnimNum value={totalVisits} /></span>
                  <span className="noc-sum-sub">visitas hoy</span>
                </div>
              </div>
            </>
          ) : (
            <NOCHistorico trendsData={trendsData} historicalData={historicalData} ranking={ranking} />
          )}
        </div>

        <footer className="noc-footer">
          <span className="noc-foot-dag">Domingo Alonso Group</span>
          <div className="noc-foot-center">
            <img src="/siempria-logo.png" alt="" className="noc-foot-logo" />
          </div>
          <div className="noc-foot-right">
            <span>Desarrollado por</span>
            <span className="noc-foot-brand">Siempria</span>
            <span className="noc-foot-sep">|</span>
            <span>Tecnologia Mobotix</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
