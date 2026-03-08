/**
 * NOCCompetitivoFloatingButton - Floating button to open NOC Competitivo dashboard
 * Shows quick stats and opens fullscreen competitive leaderboard
 */
import { useState, useEffect, useCallback } from 'react';
import { Trophy, X, TrendingUp, Users, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import NOCCompetitivo from '@/components/panels/NOCCompetitivo';

const NOCCompetitivoFloatingButton = ({ authAxios }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [quickStats, setQuickStats] = useState({ total: 0, leader: null });
  const [isHovered, setIsHovered] = useState(false);
  
  // Fetch quick stats for the badge
  const fetchQuickStats = useCallback(async () => {
    try {
      const response = await authAxios.get('/brand-statistics/ranking', {
        params: { period: 'day' }
      });
      const ranking = response.data.ranking || [];
      const total = ranking.reduce((sum, item) => sum + (item.total_visits || 0), 0);
      const leader = ranking.length > 0 ? ranking[0] : null;
      setQuickStats({ total, leader });
    } catch (error) {
      console.error('Error fetching quick stats:', error);
    }
  }, [authAxios]);
  
  useEffect(() => {
    fetchQuickStats();
    const interval = setInterval(fetchQuickStats, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [fetchQuickStats]);
  
  return (
    <>
      {/* Floating Button */}
      <div 
        className="fixed bottom-44 right-6 z-40"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Quick stats tooltip on hover */}
        <div className={cn(
          "absolute bottom-full right-0 mb-2 transition-all duration-300",
          isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        )}>
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl min-w-[200px]">
            <div className="text-xs text-slate-400 mb-2">Ranking Hoy</div>
            {quickStats.leader && (
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium text-white">{quickStats.leader.brand_name}</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {(quickStats.leader.total_visits || 0).toLocaleString('es-ES')}
                </Badge>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Users className="w-3 h-3" />
              <span>{quickStats.total.toLocaleString('es-ES')} visitas totales</span>
            </div>
          </div>
        </div>
        
        {/* Main button */}
        <Button
          onClick={() => setIsOpen(true)}
          className={cn(
            "relative h-14 w-14 rounded-full shadow-lg transition-all duration-300",
            "bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-600",
            "hover:from-yellow-400 hover:via-amber-400 hover:to-orange-500",
            "hover:scale-110 hover:shadow-xl hover:shadow-amber-500/30",
            "border-2 border-yellow-300/50"
          )}
          data-testid="noc-competitivo-btn"
        >
          <Trophy className="w-6 h-6 text-white" />
          
          {/* Pulse animation when there are visits */}
          {quickStats.total > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 items-center justify-center">
                <Flame className="w-2.5 h-2.5 text-white" />
              </span>
            </span>
          )}
        </Button>
        
        {/* Label */}
        <div className={cn(
          "absolute -left-24 top-1/2 -translate-y-1/2 transition-all duration-300 whitespace-nowrap pointer-events-none",
          isHovered ? "opacity-100 -translate-x-0" : "opacity-0 translate-x-2"
        )}>
          <span className="bg-slate-900/90 text-white text-xs px-2 py-1 rounded-md shadow-lg">
            NOC Competitivo
          </span>
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
