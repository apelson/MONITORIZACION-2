/**
 * VideoTutorials - Panel de video tutoriales
 * Muestra guías en video para aprender a usar el sistema
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  PlayCircle, Clock, Search, BookOpen, Monitor, 
  Camera, Bell, Shield, Settings, Users, Filter,
  ChevronRight, Star, TrendingUp
} from 'lucide-react';

// Video tutorials data
const TUTORIALS = [
  {
    id: 1,
    title: 'Introducción al Sistema',
    description: 'Aprende los conceptos básicos de WatchTower y cómo navegar por el dashboard.',
    duration: '5:30',
    category: 'basics',
    difficulty: 'beginner',
    thumbnail: '/api/placeholder/320/180',
    videoUrl: null, // Placeholder - would be actual video URL
    views: 1250,
    featured: true
  },
  {
    id: 2,
    title: 'Añadir y Configurar Dispositivos',
    description: 'Paso a paso para añadir cámaras, grabadores y otros dispositivos al sistema.',
    duration: '8:45',
    category: 'devices',
    difficulty: 'beginner',
    thumbnail: '/api/placeholder/320/180',
    videoUrl: null,
    views: 890
  },
  {
    id: 3,
    title: 'Gestión de Alertas',
    description: 'Configura notificaciones, umbrales de alerta y respuestas automáticas.',
    duration: '6:20',
    category: 'alerts',
    difficulty: 'intermediate',
    thumbnail: '/api/placeholder/320/180',
    videoUrl: null,
    views: 654
  },
  {
    id: 4,
    title: 'Configuración de CRA',
    description: 'Aprende a configurar la Central Receptora de Alarmas para máxima seguridad.',
    duration: '12:15',
    category: 'security',
    difficulty: 'advanced',
    thumbnail: '/api/placeholder/320/180',
    videoUrl: null,
    views: 432
  },
  {
    id: 5,
    title: 'Usuarios y Permisos',
    description: 'Gestiona usuarios, roles y permisos de acceso al sistema.',
    duration: '7:00',
    category: 'users',
    difficulty: 'intermediate',
    thumbnail: '/api/placeholder/320/180',
    videoUrl: null,
    views: 567
  },
  {
    id: 6,
    title: 'Grabadores Dahua - Configuración',
    description: 'Integra y configura grabadores DVR/NVR Dahua con el sistema.',
    duration: '10:30',
    category: 'devices',
    difficulty: 'intermediate',
    thumbnail: '/api/placeholder/320/180',
    videoUrl: null,
    views: 789
  },
  {
    id: 7,
    title: 'Reportes y Estadísticas',
    description: 'Genera informes detallados y analiza el rendimiento de tu infraestructura.',
    duration: '9:15',
    category: 'reports',
    difficulty: 'intermediate',
    thumbnail: '/api/placeholder/320/180',
    videoUrl: null,
    views: 345
  },
  {
    id: 8,
    title: 'Fail2ban y Seguridad Avanzada',
    description: 'Protege tu sistema con detección de intrusos y bloqueo automático de IPs.',
    duration: '11:00',
    category: 'security',
    difficulty: 'advanced',
    thumbnail: '/api/placeholder/320/180',
    videoUrl: null,
    views: 234
  }
];

const CATEGORIES = [
  { id: 'all', name: 'Todos', icon: BookOpen },
  { id: 'basics', name: 'Básicos', icon: Monitor },
  { id: 'devices', name: 'Dispositivos', icon: Camera },
  { id: 'alerts', name: 'Alertas', icon: Bell },
  { id: 'security', name: 'Seguridad', icon: Shield },
  { id: 'users', name: 'Usuarios', icon: Users },
  { id: 'reports', name: 'Reportes', icon: TrendingUp }
];

const getDifficultyBadge = (difficulty) => {
  switch (difficulty) {
    case 'beginner':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Principiante</Badge>;
    case 'intermediate':
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Intermedio</Badge>;
    case 'advanced':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Avanzado</Badge>;
    default:
      return null;
  }
};

const VideoCard = ({ tutorial, onClick }) => {
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 overflow-hidden"
      onClick={() => onClick(tutorial)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center group">
        <Camera className="w-12 h-12 text-slate-600" />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <PlayCircle className="w-16 h-16 text-white" />
        </div>
        {tutorial.featured && (
          <Badge className="absolute top-2 left-2 bg-yellow-500 text-yellow-900 gap-1">
            <Star className="w-3 h-3" />
            Destacado
          </Badge>
        )}
        <Badge variant="secondary" className="absolute bottom-2 right-2 bg-black/70 text-white">
          <Clock className="w-3 h-3 mr-1" />
          {tutorial.duration}
        </Badge>
      </div>
      
      {/* Content */}
      <CardContent className="p-4">
        <h3 className="font-semibold text-sm line-clamp-2 mb-2">{tutorial.title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{tutorial.description}</p>
        <div className="flex items-center justify-between">
          {getDifficultyBadge(tutorial.difficulty)}
          <span className="text-xs text-muted-foreground">{tutorial.views} vistas</span>
        </div>
      </CardContent>
    </Card>
  );
};

const VideoTutorials = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedVideo, setSelectedVideo] = useState(null);

  // Filter tutorials
  const filteredTutorials = TUTORIALS.filter(tutorial => {
    const matchesSearch = tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tutorial.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tutorial.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get featured tutorials
  const featuredTutorials = TUTORIALS.filter(t => t.featured);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-red-500" />
              Video Tutoriales
            </CardTitle>
            <CardDescription>
              Aprende a usar WatchTower con nuestras guías en video
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <BookOpen className="w-3 h-3" />
            {TUTORIALS.length} tutoriales
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar tutoriales..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {CATEGORIES.map(category => {
              const Icon = category.icon;
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="gap-1 whitespace-nowrap"
                >
                  <Icon className="w-3 h-3" />
                  {category.name}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Featured Section */}
        {selectedCategory === 'all' && !searchQuery && featuredTutorials.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              Tutoriales Destacados
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featuredTutorials.map(tutorial => (
                <VideoCard 
                  key={tutorial.id} 
                  tutorial={tutorial} 
                  onClick={setSelectedVideo}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Tutorials Grid */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Filter className="w-4 h-4" />
            {selectedCategory === 'all' ? 'Todos los Tutoriales' : CATEGORIES.find(c => c.id === selectedCategory)?.name}
            <Badge variant="secondary">{filteredTutorials.length}</Badge>
          </h3>
          
          {filteredTutorials.length > 0 ? (
            <ScrollArea className="h-[500px] pr-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredTutorials.map(tutorial => (
                  <VideoCard 
                    key={tutorial.id} 
                    tutorial={tutorial} 
                    onClick={setSelectedVideo}
                  />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No se encontraron tutoriales</p>
              <p className="text-sm">Intenta con otros términos de búsqueda</p>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold mb-3">Empezar Rápido</h4>
          <div className="flex flex-wrap gap-2">
            {['Añadir Cámara', 'Configurar Alertas', 'Crear Usuario', 'Ver Reportes'].map(link => (
              <Button key={link} variant="outline" size="sm" className="gap-1">
                {link}
                <ChevronRight className="w-3 h-3" />
              </Button>
            ))}
          </div>
        </div>
      </CardContent>

      {/* Video Player Dialog */}
      <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedVideo?.title}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
            {selectedVideo?.videoUrl ? (
              <video 
                src={selectedVideo.videoUrl} 
                controls 
                autoPlay 
                className="w-full h-full rounded-lg"
              />
            ) : (
              <div className="text-center text-white">
                <PlayCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Video próximamente</p>
                <p className="text-sm text-gray-400 mt-2">{selectedVideo?.description}</p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              {selectedVideo && getDifficultyBadge(selectedVideo.difficulty)}
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {selectedVideo?.duration}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">{selectedVideo?.views} vistas</span>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default VideoTutorials;
