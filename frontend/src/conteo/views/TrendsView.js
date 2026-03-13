import { useState, useMemo } from 'react';
import { Users, TrendingUp, Activity, BarChart3 } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { AnimNum, EmptyState } from '../shared';
import { ALL_BRANDS, BRAND_COLORS } from '../constants';

export function TrendsView({ data }) {
  const [selectedBrand, setSelectedBrand] = useState('all');
  const currentHour = new Date().getHours();
  
  const { hourly_today = [], daily_week = [], brand_hourly = {} } = data || {};

  const chartHourly = useMemo(() => {
    if (selectedBrand === 'all') {
      return hourly_today.filter(h => h.hour <= currentHour);
    }
    const bh = brand_hourly[selectedBrand] || [];
    return bh.filter(h => h.hour <= currentHour);
  }, [selectedBrand, hourly_today, brand_hourly, currentHour]);

  if (!data) return <EmptyState text="Sin datos de tendencias" />;

  const totalToday = hourly_today.reduce((s, h) => s + h.entries, 0);
  const peakHour = hourly_today.reduce((max, h) => h.entries > (max?.entries || 0) ? h : max, hourly_today[0]);
  const avgHourly = currentHour > 0 ? Math.round(totalToday / currentHour) : 0;

  const brandKeys = Object.keys(brand_hourly);
  const brandOptions = [{ id: 'all', name: 'Todas las marcas' }, ...ALL_BRANDS.filter(b => brandKeys.includes(b.id))];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="trend-tooltip">
        <p className="trend-tooltip-label">{label}</p>
        <p className="trend-tooltip-val">{payload[0].value.toLocaleString('es-ES')} visitas</p>
      </div>
    );
  };

  return (
    <div className="view-wrap" data-testid="trends-view">
      <div className="trends-kpi-grid">
        <div className="trends-kpi">
          <div className="trends-kpi-icon" style={{ background: '#E8F1F8', color: '#4A7CA7' }}><Users size={20} /></div>
          <div className="trends-kpi-data">
            <span className="trends-kpi-val mono"><AnimNum value={totalToday} /></span>
            <span className="trends-kpi-label">Total hoy</span>
          </div>
        </div>
        <div className="trends-kpi">
          <div className="trends-kpi-icon" style={{ background: '#FEF3C7', color: '#92400E' }}><TrendingUp size={20} /></div>
          <div className="trends-kpi-data">
            <span className="trends-kpi-val mono">{peakHour ? `${peakHour.hour}:00` : '--'}</span>
            <span className="trends-kpi-label">Hora pico ({peakHour?.entries || 0})</span>
          </div>
        </div>
        <div className="trends-kpi">
          <div className="trends-kpi-icon" style={{ background: '#EDE9FE', color: '#7C3AED' }}><Activity size={20} /></div>
          <div className="trends-kpi-data">
            <span className="trends-kpi-val mono"><AnimNum value={avgHourly} /></span>
            <span className="trends-kpi-label">Media/hora</span>
          </div>
        </div>
      </div>

      <div className="card trends-chart-card">
        <div className="trends-chart-header">
          <h2 className="card-title"><TrendingUp size={18} /> Flujo de Visitas por Hora — Hoy</h2>
          <select
            className="trends-brand-select"
            value={selectedBrand}
            onChange={e => setSelectedBrand(e.target.value)}
            data-testid="trends-brand-filter"
          >
            {brandOptions.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="trends-chart-wrap">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartHourly} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradientBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5B8DB8" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#5B8DB8" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A0B0' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A0B0' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="entries" stroke="#5B8DB8" strokeWidth={2.5} fill="url(#gradientBlue)" dot={false} activeDot={{ r: 5, fill: '#5B8DB8', stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {daily_week.length > 0 && (
        <div className="card trends-chart-card" style={{ marginTop: '1rem' }}>
          <h2 className="card-title"><BarChart3 size={18} /> Visitas por Dia — Esta Semana</h2>
          <div className="trends-chart-wrap">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={daily_week} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94A0B0', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A0B0' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="entries" fill="#5B8DB8" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {brandKeys.length > 1 && (
        <div className="card trends-chart-card" style={{ marginTop: '1rem' }}>
          <h2 className="card-title"><Activity size={18} /> Comparativa por Marca — Hoy</h2>
          <div className="trends-chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A0B0' }} axisLine={false} tickLine={false}
                  data={hourly_today.filter(h => h.hour <= currentHour)} />
                <YAxis tick={{ fontSize: 11, fill: '#94A0B0' }} axisLine={false} tickLine={false} />
                <Tooltip />
                {brandKeys.map(bid => {
                  const brand = ALL_BRANDS.find(b => b.id === bid);
                  const bData = (brand_hourly[bid] || []).filter(h => h.hour <= currentHour);
                  return (
                    <Line key={bid} data={bData} dataKey="entries" name={brand?.name || bid}
                      stroke={BRAND_COLORS[bid] || '#5B8DB8'} strokeWidth={2} dot={false} />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
