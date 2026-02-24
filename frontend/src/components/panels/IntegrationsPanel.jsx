/**
 * IntegrationsPanel - Panel contenedor para todas las integraciones
 * Incluye: Email/SMTP, JIRA, y futuras integraciones
 */
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Ticket, Puzzle } from 'lucide-react';
import SettingsPanel from './SettingsPanel';
import JiraConfigPanel from '../settings/JiraConfigPanel';

const IntegrationsPanel = ({ settings, onSave, authAxios }) => {
  const [activeTab, setActiveTab] = useState('email');

  return (
    <div className="space-y-6" data-testid="integrations-panel">
      <div className="flex items-center gap-3 mb-6">
        <Puzzle className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Integraciones</h1>
          <p className="text-sm text-muted-foreground">
            Configura las integraciones con servicios externos
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="email" className="gap-2">
            <Mail className="w-4 h-4" />
            Email / SMTP
          </TabsTrigger>
          <TabsTrigger value="jira" className="gap-2">
            <Ticket className="w-4 h-4" />
            JIRA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="mt-6">
          <SettingsPanel 
            settings={settings} 
            onSave={onSave} 
            authAxios={authAxios} 
          />
        </TabsContent>

        <TabsContent value="jira" className="mt-6">
          <JiraConfigPanel authAxios={authAxios} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntegrationsPanel;
