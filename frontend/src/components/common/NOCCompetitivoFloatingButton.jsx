/**
 * NOCCompetitivoFloatingButton - Floating lateral button for NOC Competitivo
 * Same style as CRA and LiveViewer buttons
 * Shows real-time ranking stats with expand on hover
 */
import { useState, useEffect, useCallback } from 'react';
import { Trophy, Crown, ChevronRight, TrendingUp, MapPin, Users } from 'lucide-react';
import { Badge } from '../ui/badge';
import NOCCompetitivo from '@/components/panels/NOCCompetitivo';

const NOCCompetitivoFloatingButton = ({ authAxios, onClick, isActive }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [stats, setStats] = useState({ total: 0, leader: null, islands: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const response = await authAxios.get('/brand-statistics/ranking', {
        params: { period: 'day' }
      });
      const ranking = response.data.ranking || [];
      const total = ranking.reduce((sum, item) => sum + (item.total_visits || 0), 0);
      const leader = ranking.length > 0 ? ranking[0] : null;
      
      // Count islands with activity
      const islandsResponse = await authAxios.get('/brand-statistics/history/by-island', {
        params: { 
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0]
        }
      });
      const islandsData = islandsResponse.data.islands || {};
      const activeIslands = Object.values(islandsData).filter(i => i.total > 0).length;
      
      setStats({ total, leader, islands: activeIslands });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const handleClick = () => {
    setIsOpen(true);
  };

  if (loading) {
    return (
      <div className="fixed right-0 z-50" style={{ top: '360px' }}>
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-2 sm:p-3 rounded-l-xl shadow-lg animate-pulse">
          <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div 
        className="fixed right-0 z-50 transition-all duration-300"
        style={{ top: '360px' }}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        data-testid="noc-competitivo-btn"
      >
        <div 
          className={`
            flex items-center cursor-pointer shadow-2xl rounded-l-xl overflow-hidden
            transition-all duration-300
            bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 text-white
            hover:from-amber-400 hover:via-orange-400 hover:to-orange-500
            ${isActive || isOpen ? 'ring-4 ring-orange-300 ring-opacity-50' : ''}
          `}
          onClick={handleClick}
        >
          {/* Icon section */}
          <div className={`p-2 sm:p-3 flex flex-col items-center justify-center ${isExpanded ? 'sm:border-r border-white/20' : ''}`}>
            <Trophy className="w-5 h-5 sm:w-8 sm:h-8" />
            {stats.total > 0 && (
              <span className="text-[10px] sm:text-xs font-bold mt-0.5 sm:mt-1">
                {stats.total.toLocaleString('es-ES')}
              </span>
            )}
          </div>

          {/* Expanded content */}
          <div className={`overflow-hidden transition-all duration-300 hidden sm:block ${isExpanded ? 'w-44 opacity-100' : 'w-0 opacity-0'}`}>
            <div className="p-3 whitespace-nowrap">
              <div className="font-bold text-sm mb-1 flex items-center gap-2">
                <Crown className="w-4 h-4 text-yellow-200" />
                NOC Competitivo
              </div>
              
              <div className="space-y-1 text-xs">
                {stats.leader && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Líder
                    </span>
                    <Badge variant="secondary" className="bg-white/20 text-white h-5 max-w-[80px] truncate">
                      {stats.leader.brand_name}
                    </Badge>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Visitas hoy
                  </span>
                  <Badge variant="secondary" className="bg-white/20 text-white h-5">
                    {stats.total.toLocaleString('es-ES')}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Islas activas
                  </span>
                  <Badge variant="secondary" className="bg-white/20 text-white h-5">
                    {stats.islands}/7
                  </Badge>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between text-xs">
                <span>Ver ranking</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Pulse animation for live indicator */}
        <div className="absolute top-1 sm:top-2 left-1 sm:left-2 pointer-events-none">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-300 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Fullscreen NOC Competitivo Dashboard */}
      {isOpen && (
        <NOCCompetitivo 
          authAxios={authAxios} 
          isFullscreen={true}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default NOCCompetitivoFloatingButton;
