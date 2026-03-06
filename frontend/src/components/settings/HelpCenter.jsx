/**
 * HelpCenter - Centro de Ayuda Integrado
 * Proporciona documentación, FAQs y acceso al tour de bienvenida
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  HelpCircle, Search, Book, Video, MessageCircle, ChevronDown,
  Camera, Bell, Shield, HardDrive, Settings, Users, Rocket,
  ExternalLink, Mail, Phone, Clock
} from 'lucide-react';

// FAQ data
const FAQS = [
  {
    category: 'Dispositivos',
    icon: Camera,
    questions: [
      {
        q: '¿Cómo añado un nuevo dispositivo?',
        a: 'Ve a la pestaña "Devices" y haz clic en "+ Add". Introduce la IP del dispositivo, usuario y contraseña. El sistema detectará automáticamente el tipo de dispositivo.'
      },
      {
        q: '¿Por qué un dispositivo aparece como offline?',
        a: 'Puede ser por: 1) El dispositivo está apagado o sin conexión de red, 2) La IP ha cambiado, 3) El puerto está bloqueado por el firewall, 4) Las credenciales son incorrectas.'
      },
      {
        q: '¿Cómo cambio la frecuencia de monitorización?',
        a: 'En Configuración → Sistema, puedes ajustar el intervalo de comprobación. El valor por defecto es 60 segundos.'
      }
    ]
  },
  {
    category: 'Alertas',
    icon: Bell,
    questions: [
      {
        q: '¿Cómo configuro alertas por Telegram?',
        a: 'Ve a Configuración → Telegram. Necesitas crear un bot en @BotFather y obtener el token. Luego, añade el Chat ID del grupo o usuario donde quieres recibir las alertas.'
      },
      {
        q: '¿Puedo silenciar alertas temporalmente?',
        a: 'Sí, puedes poner un dispositivo en "Mantenimiento" desde el menú de acciones. Mientras esté en mantenimiento, no generará alertas.'
      },
      {
        q: '¿Cómo funciona el sistema de alertas sonoras?',
        a: 'En Configuración → Alertas Sonoras puedes activar notificaciones de audio. Recibirás un sonido cuando un dispositivo crítico se desconecte.'
      }
    ]
  },
  {
    category: 'Grabadores',
    icon: HardDrive,
    questions: [
      {
        q: '¿Qué es la tecnología P2P?',
        a: 'P2P (Peer to Peer) permite acceder a tus grabadores Dahua sin necesidad de IP pública ni configuración de puertos. Solo necesitas el número de serie del dispositivo.'
      },
      {
        q: '¿Por qué no puedo ver la vista en directo?',
        a: 'Verifica que: 1) El grabador está online, 2) Las credenciales P2P son correctas, 3) El grabador tiene conexión a internet, 4) No hay restricciones de red.'
      },
      {
        q: '¿Cómo monitorizo el espacio en disco?',
        a: 'En la pestaña "Grabadores" puedes ver el estado del disco de cada NVR/DVR. El sistema te alertará cuando el espacio sea bajo.'
      }
    ]
  },
  {
    category: 'CRA',
    icon: Shield,
    questions: [
      {
        q: '¿Qué es la Central Receptora de Alarmas?',
        a: 'La CRA es un servicio profesional que recibe y gestiona las señales de alarma 24/7. WatchTower se integra con CRA para enviar eventos automáticamente.'
      },
      {
        q: '¿Cómo configuro la integración con CRA?',
        a: 'Contacta con tu proveedor de CRA para obtener los datos de conexión. Luego ve a Configuración → CRA e introduce los parámetros proporcionados.'
      }
    ]
  },
  {
    category: 'Usuarios y Permisos',
    icon: Users,
    questions: [
      {
        q: '¿Qué roles de usuario existen?',
        a: 'Admin (acceso total), Operator (gestión de dispositivos), Technician (solo visualización), Tenant Admin (gestión de su organización).'
      },
      {
        q: '¿Cómo creo un nuevo usuario?',
        a: 'Ve a la pestaña "Users" y haz clic en "Nuevo Usuario". Asigna un rol y, si aplica, una organización específica.'
      }
    ]
  }
];

// Quick guides
const QUICK_GUIDES = [
  { title: 'Primeros pasos', icon: Rocket, description: 'Configura tu sistema en 5 minutos' },
  { title: 'Añadir dispositivos', icon: Camera, description: 'Guía rápida para añadir cámaras' },
  { title: 'Configurar alertas', icon: Bell, description: 'Configura Telegram y email' },
  { title: 'Gestionar grabadores', icon: HardDrive, description: 'Configura tus DVR/NVR' },
];

const HelpCenter = ({ onStartTour }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [openCategories, setOpenCategories] = useState({});

  const toggleCategory = (category) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const filteredFaqs = FAQS.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => q.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
           q.a.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(cat => cat.questions.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-600" />
          Centro de Ayuda
        </CardTitle>
        <CardDescription>
          Encuentra respuestas a tus preguntas y aprende a usar WatchTower
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar en la ayuda..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2"
            onClick={onStartTour}
          >
            <Rocket className="w-5 h-5 text-purple-600" />
            <span className="text-xs">Tour de Bienvenida</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex-col gap-2">
            <Book className="w-5 h-5 text-blue-600" />
            <span className="text-xs">Documentación</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex-col gap-2">
            <Video className="w-5 h-5 text-red-600" />
            <span className="text-xs">Video Tutoriales</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex-col gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            <span className="text-xs">Soporte</span>
          </Button>
        </div>

        {/* Quick Guides */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Book className="w-4 h-4" />
            Guías Rápidas
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_GUIDES.map((guide, idx) => {
              const Icon = guide.icon;
              return (
                <div 
                  key={idx}
                  className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-sm">{guide.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{guide.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* FAQs */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            Preguntas Frecuentes
          </h3>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2 pr-4">
              {filteredFaqs.map((category, catIdx) => {
                const Icon = category.icon;
                const isOpen = openCategories[category.category];
                
                return (
                  <Collapsible key={catIdx} open={isOpen} onOpenChange={() => toggleCategory(category.category)}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">{category.category}</span>
                          <Badge variant="secondary" className="text-xs">
                            {category.questions.length}
                          </Badge>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="pl-6 pt-2 space-y-2">
                        {category.questions.map((faq, faqIdx) => (
                          <div key={faqIdx} className="p-3 border rounded-lg">
                            <p className="font-medium text-sm mb-2">{faq.q}</p>
                            <p className="text-sm text-muted-foreground">{faq.a}</p>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Contact Support */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold mb-2">¿Necesitas más ayuda?</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Nuestro equipo de soporte está disponible para ayudarte
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1">
              <Mail className="w-3 h-3" />
              soporte@siempria.com
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Phone className="w-3 h-3" />
              +34 900 000 000
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Clock className="w-3 h-3" />
              L-V 9:00-18:00
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HelpCenter;
