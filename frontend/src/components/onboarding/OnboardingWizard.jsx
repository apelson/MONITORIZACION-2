/**
 * OnboardingWizard - Guía paso a paso para nuevos tenant_admin
 * Se muestra automáticamente cuando un tenant_admin no tiene organizaciones
 */
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Building2, Users, Monitor, Bell, CheckCircle2, ArrowRight, ArrowLeft,
  Rocket, Shield, Network, Settings, PartyPopper, Loader2
} from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Bienvenida', icon: Rocket, description: 'Conoce WatchTower' },
  { id: 2, title: 'Organización', icon: Building2, description: 'Crea tu primera organización' },
  { id: 3, title: 'Grupo', icon: Network, description: 'Organiza tus dispositivos' },
  { id: 4, title: 'Dispositivo', icon: Monitor, description: 'Añade tu primer dispositivo' },
  { id: 5, title: 'Completado', icon: PartyPopper, description: '¡Listo para empezar!' },
];

const OnboardingWizard = ({ 
  isOpen, 
  onClose, 
  authAxios, 
  user,
  onComplete 
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState([]);
  
  // Form data
  const [orgData, setOrgData] = useState({
    name: '',
    description: '',
    city: '',
    contact_email: user?.email || ''
  });
  
  const [groupData, setGroupData] = useState({
    name: '',
    description: ''
  });
  
  const [deviceData, setDeviceData] = useState({
    name: '',
    ip_address: '',
    port: '80'
  });
  
  // Created IDs
  const [createdOrgId, setCreatedOrgId] = useState(null);
  const [createdGroupId, setCreatedGroupId] = useState(null);

  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const markStepComplete = (stepId) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
    }
  };

  // Step 2: Create Organization
  const handleCreateOrganization = async () => {
    if (!orgData.name.trim()) {
      toast.error('El nombre de la organización es obligatorio');
      return;
    }
    
    try {
      setLoading(true);
      const response = await authAxios.post('/organizations', {
        name: orgData.name,
        description: orgData.description,
        city: orgData.city,
        contact_email: orgData.contact_email
      });
      
      const newOrg = response.data.organization;
      setCreatedOrgId(newOrg.id);
      markStepComplete(2);
      toast.success(`Organización "${orgData.name}" creada`);
      handleNext();
    } catch (error) {
      toast.error('Error al crear organización: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Create Group
  const handleCreateGroup = async () => {
    if (!groupData.name.trim()) {
      toast.error('El nombre del grupo es obligatorio');
      return;
    }
    
    if (!createdOrgId) {
      toast.error('Primero debes crear una organización');
      setCurrentStep(2);
      return;
    }
    
    try {
      setLoading(true);
      const response = await authAxios.post('/groups', {
        name: groupData.name,
        description: groupData.description,
        organization_id: createdOrgId
      });
      
      const newGroup = response.data.group;
      setCreatedGroupId(newGroup.id);
      markStepComplete(3);
      toast.success(`Grupo "${groupData.name}" creado`);
      handleNext();
    } catch (error) {
      toast.error('Error al crear grupo: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Create Device
  const handleCreateDevice = async () => {
    if (!deviceData.name.trim() || !deviceData.ip_address.trim()) {
      toast.error('Nombre e IP son obligatorios');
      return;
    }
    
    if (!createdGroupId) {
      toast.error('Primero debes crear un grupo');
      setCurrentStep(3);
      return;
    }
    
    try {
      setLoading(true);
      await authAxios.post('/devices', {
        name: deviceData.name,
        ip_address: deviceData.ip_address,
        port: parseInt(deviceData.port) || 80,
        group_id: createdGroupId,
        device_type: 'camera'
      });
      
      markStepComplete(4);
      toast.success(`Dispositivo "${deviceData.name}" añadido`);
      handleNext();
    } catch (error) {
      toast.error('Error al añadir dispositivo: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Skip device step
  const handleSkipDevice = () => {
    markStepComplete(4);
    handleNext();
  };

  // Complete onboarding
  const handleFinish = () => {
    markStepComplete(5);
    if (onComplete) onComplete();
    onClose();
    toast.success('¡Bienvenido a WatchTower! Tu cuenta está lista.');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center space-y-6 py-4">
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">¡Bienvenido a WatchTower!</h2>
              <p className="text-muted-foreground">
                Tu plataforma de monitorización de red y videovigilancia
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4">
              <Card className="bg-muted/50">
                <CardContent className="p-4 text-center">
                  <Building2 className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-sm font-medium">Organizaciones</p>
                  <p className="text-xs text-muted-foreground">Gestiona tus clientes</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="p-4 text-center">
                  <Monitor className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm font-medium">Dispositivos</p>
                  <p className="text-xs text-muted-foreground">Monitoriza 24/7</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="p-4 text-center">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                  <p className="text-sm font-medium">Alertas</p>
                  <p className="text-xs text-muted-foreground">Notificaciones en tiempo real</p>
                </CardContent>
              </Card>
            </div>
            <p className="text-sm text-muted-foreground pt-2">
              En los siguientes pasos configurarás tu primera organización, grupo y dispositivo.
            </p>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-xl mx-auto flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-xl font-bold mb-1">Crea tu primera Organización</h2>
              <p className="text-sm text-muted-foreground">
                Una organización representa a tu empresa o cliente
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Nombre de la organización *</Label>
                <Input
                  id="org-name"
                  placeholder="Ej: Mi Empresa S.L."
                  value={orgData.name}
                  onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-city">Ciudad</Label>
                <Input
                  id="org-city"
                  placeholder="Ej: Madrid"
                  value={orgData.city}
                  onChange={(e) => setOrgData({ ...orgData, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-email">Email de contacto</Label>
                <Input
                  id="org-email"
                  type="email"
                  placeholder="contacto@empresa.com"
                  value={orgData.contact_email}
                  onChange={(e) => setOrgData({ ...orgData, contact_email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-desc">Descripción (opcional)</Label>
                <Input
                  id="org-desc"
                  placeholder="Breve descripción..."
                  value={orgData.description}
                  onChange={(e) => setOrgData({ ...orgData, description: e.target.value })}
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-xl mx-auto flex items-center justify-center mb-4">
                <Network className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold mb-1">Crea un Grupo</h2>
              <p className="text-sm text-muted-foreground">
                Los grupos organizan tus dispositivos por ubicación o función
              </p>
            </div>
            {createdOrgId && (
              <Badge variant="outline" className="w-full justify-center py-2">
                <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                Organización: {orgData.name}
              </Badge>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">Nombre del grupo *</Label>
                <Input
                  id="group-name"
                  placeholder="Ej: Oficina Central, Almacén, Parking..."
                  value={groupData.name}
                  onChange={(e) => setGroupData({ ...groupData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-desc">Descripción (opcional)</Label>
                <Input
                  id="group-desc"
                  placeholder="Descripción del grupo..."
                  value={groupData.description}
                  onChange={(e) => setGroupData({ ...groupData, description: e.target.value })}
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-xl mx-auto flex items-center justify-center mb-4">
                <Monitor className="w-8 h-8 text-purple-500" />
              </div>
              <h2 className="text-xl font-bold mb-1">Añade tu primer Dispositivo</h2>
              <p className="text-sm text-muted-foreground">
                Puede ser una cámara, router, NAS, servidor...
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              {createdOrgId && (
                <Badge variant="outline" className="py-1">
                  <Building2 className="w-3 h-3 mr-1" />
                  {orgData.name}
                </Badge>
              )}
              {createdGroupId && (
                <Badge variant="outline" className="py-1">
                  <Network className="w-3 h-3 mr-1" />
                  {groupData.name}
                </Badge>
              )}
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="device-name">Nombre del dispositivo *</Label>
                <Input
                  id="device-name"
                  placeholder="Ej: Cámara Entrada Principal"
                  value={deviceData.name}
                  onChange={(e) => setDeviceData({ ...deviceData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="device-ip">Dirección IP *</Label>
                  <Input
                    id="device-ip"
                    placeholder="192.168.1.100"
                    value={deviceData.ip_address}
                    onChange={(e) => setDeviceData({ ...deviceData, ip_address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="device-port">Puerto</Label>
                  <Input
                    id="device-port"
                    placeholder="80"
                    value={deviceData.port}
                    onChange={(e) => setDeviceData({ ...deviceData, port: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Puedes añadir más dispositivos después desde el panel principal
            </p>
          </div>
        );

      case 5:
        return (
          <div className="text-center space-y-6 py-8">
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full mx-auto flex items-center justify-center shadow-lg animate-pulse">
              <PartyPopper className="w-12 h-12 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">¡Configuración Completada!</h2>
              <p className="text-muted-foreground">
                Tu cuenta WatchTower está lista para usar
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Organización: <strong>{orgData.name || 'Creada'}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Grupo: <strong>{groupData.name || 'Creado'}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                {completedSteps.includes(4) && deviceData.name ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span>Dispositivo: <strong>{deviceData.name}</strong></span>
                  </>
                ) : (
                  <>
                    <Settings className="w-5 h-5 text-amber-500" />
                    <span className="text-muted-foreground">Añade dispositivos desde el panel</span>
                  </>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Explora el dashboard, añade más dispositivos y configura las alertas.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  const renderStepActions = () => {
    switch (currentStep) {
      case 1:
        return (
          <Button onClick={handleNext} className="w-full gap-2">
            Empezar configuración
            <ArrowRight className="w-4 h-4" />
          </Button>
        );
      case 2:
        return (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrev} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Atrás
            </Button>
            <Button 
              onClick={handleCreateOrganization} 
              className="flex-1 gap-2"
              disabled={loading || !orgData.name.trim()}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Crear y continuar
            </Button>
          </div>
        );
      case 3:
        return (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrev} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Atrás
            </Button>
            <Button 
              onClick={handleCreateGroup} 
              className="flex-1 gap-2"
              disabled={loading || !groupData.name.trim()}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Crear y continuar
            </Button>
          </div>
        );
      case 4:
        return (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrev} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Atrás
            </Button>
            <Button variant="ghost" onClick={handleSkipDevice}>
              Omitir
            </Button>
            <Button 
              onClick={handleCreateDevice} 
              className="flex-1 gap-2"
              disabled={loading || !deviceData.name.trim() || !deviceData.ip_address.trim()}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Añadir dispositivo
            </Button>
          </div>
        );
      case 5:
        return (
          <Button onClick={handleFinish} className="w-full gap-2 bg-green-600 hover:bg-green-700">
            <Rocket className="w-4 h-4" />
            Ir al Dashboard
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg" data-testid="onboarding-wizard">
        {/* Progress header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Paso {currentStep} de {STEPS.length}</span>
            <span className="font-medium">{STEPS[currentStep - 1]?.title}</span>
          </div>
          <Progress value={progress} className="h-2" />
          
          {/* Step indicators */}
          <div className="flex justify-between">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isComplete = completedSteps.includes(step.id) || currentStep > step.id;
              
              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-center gap-1 ${
                    isActive ? 'text-primary' : isComplete ? 'text-green-500' : 'text-muted-foreground'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    isActive ? 'bg-primary text-primary-foreground' : 
                    isComplete ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'
                  }`}>
                    {isComplete && !isActive ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-[10px] hidden sm:block">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="min-h-[300px]">
          {renderStepContent()}
        </div>

        {/* Actions */}
        <div className="pt-4 border-t">
          {renderStepActions()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingWizard;
