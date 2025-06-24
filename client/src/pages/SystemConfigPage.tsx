import React, { useState } from 'react';
import { Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { 
  ArrowLeft,
  Settings,
  AlertTriangle,
  Shield,
  Database,
  Globe,
  Bell,
  Clock,
  Activity,
  Server,
  LogOut,
  Save,
  RotateCcw,
  Power,
  PowerOff,
  Wrench,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface SystemConfig {
  general: {
    systemName: string;
    adminEmail: string;
    timezone: string;
    defaultLanguage: string;
    maintenanceMode: boolean;
    maintenanceMessage: string;
  };
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    requireTwoFactor: boolean;
    passwordMinLength: number;
    passwordRequireSpecial: boolean;
    ipWhitelist: string[];
    corsOrigins: string[];
  };
  notifications: {
    emailNotifications: boolean;
    criticalAlerts: boolean;
    weeklyReports: boolean;
    maintenanceAlerts: boolean;
    slackWebhook?: string;
    discordWebhook?: string;
  };
  performance: {
    cacheTtl: number;
    rateLimitRequests: number;
    rateLimitWindow: number;
    databaseConnectionPool: number;
    enableCompression: boolean;
    enableCaching: boolean;
  };
  features: {
    analyticsEnabled: boolean;
    auditLoggingEnabled: boolean;
    apiAccessEnabled: boolean;
    bulkOperationsEnabled: boolean;
    advancedFiltering: boolean;
    realTimeUpdates: boolean;
  };
}

interface MaintenanceStatus {
  isActive: boolean;
  message: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  affectedServices: string[];
}

export default function SystemConfigPage() {
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [config, setConfig] = useState<SystemConfig | null>(null);

  const { data: systemConfig, isLoading } = useQuery<SystemConfig>({
    queryKey: ['system-config'],
    queryFn: async () => {
      const response = await apiClient.getSystemConfig();
      setConfig(response.data);
      return response.data;
    },
  });

  const { data: maintenanceStatus } = useQuery<MaintenanceStatus>({
    queryKey: ['maintenance-status'],
    queryFn: async () => {
      const response = await apiClient.getMaintenanceStatus();
      return response.data;
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (newConfig: SystemConfig) => {
      return apiClient.updateSystemConfig(newConfig);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      setHasUnsavedChanges(false);
    },
  });

  const toggleMaintenanceMutation = useMutation({
    mutationFn: async (params: { enabled: boolean; message?: string }) => {
      return apiClient.toggleMaintenanceMode(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-status'] });
    },
  });

  const restartServiceMutation = useMutation({
    mutationFn: async (service: string) => {
      return apiClient.restartService(service);
    },
  });

  const handleConfigChange = (section: keyof SystemConfig, field: string, value: any) => {
    if (!config) return;
    
    const newConfig = {
      ...config,
      [section]: {
        ...config[section],
        [field]: value
      }
    };
    
    setConfig(newConfig);
    setHasUnsavedChanges(true);
  };

  const handleSaveConfig = () => {
    if (config) {
      updateConfigMutation.mutate(config);
    }
  };

  const handleResetConfig = () => {
    if (systemConfig) {
      setConfig(systemConfig);
      setHasUnsavedChanges(false);
    }
  };

  const handleToggleMaintenance = (enabled: boolean, message?: string) => {
    toggleMaintenanceMutation.mutate({ enabled, message });
  };

  if (isLoading || !config) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading system configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/">
                <Button variant="ghost" size="sm" className="mr-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="flex items-center space-x-3">
                <Settings className="h-6 w-6 text-muted-foreground" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">System Configuration</h1>
                  <p className="text-sm text-muted-foreground">Manage global system settings and features</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {hasUnsavedChanges && (
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={handleResetConfig}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  <Button size="sm" onClick={handleSaveConfig} disabled={updateConfigMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              )}
              <Button onClick={logout} variant="outline">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Maintenance Mode Alert */}
        {maintenanceStatus?.isActive && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-900">System is in Maintenance Mode</p>
                  <p className="text-sm text-orange-700">{maintenanceStatus.message}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleToggleMaintenance(false)}
                  className="ml-auto"
                >
                  Disable Maintenance
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Basic system configuration and maintenance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">System Name</label>
                    <Input
                      value={config.general.systemName}
                      onChange={(e) => handleConfigChange('general', 'systemName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Admin Email</label>
                    <Input
                      type="email"
                      value={config.general.adminEmail}
                      onChange={(e) => handleConfigChange('general', 'adminEmail', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Timezone</label>
                    <select 
                      value={config.general.timezone}
                      onChange={(e) => handleConfigChange('general', 'timezone', e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-md"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London</option>
                      <option value="Europe/Berlin">Berlin</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Default Language</label>
                    <select 
                      value={config.general.defaultLanguage}
                      onChange={(e) => handleConfigChange('general', 'defaultLanguage', e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-md"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="zh">Chinese</option>
                      <option value="ja">Japanese</option>
                    </select>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Maintenance Mode</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Enable Maintenance Mode</p>
                        <p className="text-sm text-muted-foreground">Temporarily disable access to all servers</p>
                      </div>
                      <Switch
                        checked={config.general.maintenanceMode}
                        onCheckedChange={(checked) => handleConfigChange('general', 'maintenanceMode', checked)}
                      />
                    </div>
                    {config.general.maintenanceMode && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Maintenance Message</label>
                        <Input
                          value={config.general.maintenanceMessage}
                          onChange={(e) => handleConfigChange('general', 'maintenanceMessage', e.target.value)}
                          placeholder="System under maintenance. Please check back later."
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Service Management</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { name: 'API Gateway', status: 'healthy' },
                      { name: 'Database', status: 'healthy' },
                      { name: 'Authentication', status: 'healthy' },
                      { name: 'File Storage', status: 'degraded' },
                      { name: 'Email Service', status: 'healthy' },
                      { name: 'Monitoring', status: 'healthy' }
                    ].map((service) => (
                      <Card key={service.name} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-medium">{service.name}</p>
                          <Badge 
                            variant={service.status === 'healthy' ? 'default' : 'destructive'}
                            className={service.status === 'healthy' ? 'bg-green-500' : ''}
                          >
                            {service.status === 'healthy' ? (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            ) : service.status === 'degraded' ? (
                              <AlertCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            {service.status}
                          </Badge>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full">
                              <Power className="h-4 w-4 mr-2" />
                              Restart
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Restart {service.name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will temporarily interrupt the service. Are you sure you want to continue?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => restartServiceMutation.mutate(service.name)}
                              >
                                Restart Service
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Security Settings
                </CardTitle>
                <CardDescription>Authentication, authorization, and security policies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Session Timeout (minutes)</label>
                    <Input
                      type="number"
                      value={config.security.sessionTimeout}
                      onChange={(e) => handleConfigChange('security', 'sessionTimeout', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Login Attempts</label>
                    <Input
                      type="number"
                      value={config.security.maxLoginAttempts}
                      onChange={(e) => handleConfigChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Lockout Duration (minutes)</label>
                    <Input
                      type="number"
                      value={config.security.lockoutDuration}
                      onChange={(e) => handleConfigChange('security', 'lockoutDuration', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Password Min Length</label>
                    <Input
                      type="number"
                      value={config.security.passwordMinLength}
                      onChange={(e) => handleConfigChange('security', 'passwordMinLength', parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Require Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">Mandatory 2FA for all admin accounts</p>
                    </div>
                    <Switch
                      checked={config.security.requireTwoFactor}
                      onCheckedChange={(checked) => handleConfigChange('security', 'requireTwoFactor', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Require Special Characters</p>
                      <p className="text-sm text-muted-foreground">Passwords must contain special characters</p>
                    </div>
                    <Switch
                      checked={config.security.passwordRequireSpecial}
                      onCheckedChange={(checked) => handleConfigChange('security', 'passwordRequireSpecial', checked)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">IP Whitelist (one per line)</label>
                  <textarea
                    className="w-full p-3 border border-input rounded-md h-24"
                    value={config.security.ipWhitelist.join('\n')}
                    onChange={(e) => handleConfigChange('security', 'ipWhitelist', e.target.value.split('\n').filter(ip => ip.trim()))}
                    placeholder="192.168.1.0/24&#10;10.0.0.0/8&#10;172.16.0.0/12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">CORS Origins (one per line)</label>
                  <textarea
                    className="w-full p-3 border border-input rounded-md h-24"
                    value={config.security.corsOrigins.join('\n')}
                    onChange={(e) => handleConfigChange('security', 'corsOrigins', e.target.value.split('\n').filter(origin => origin.trim()))}
                    placeholder="https://admin.modl.gg&#10;https://api.modl.gg"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="h-5 w-5 mr-2" />
                  Notification Settings
                </CardTitle>
                <CardDescription>Configure alerts and notification channels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">Send notifications via email</p>
                    </div>
                    <Switch
                      checked={config.notifications.emailNotifications}
                      onCheckedChange={(checked) => handleConfigChange('notifications', 'emailNotifications', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Critical Alerts</p>
                      <p className="text-sm text-muted-foreground">Immediate alerts for critical issues</p>
                    </div>
                    <Switch
                      checked={config.notifications.criticalAlerts}
                      onCheckedChange={(checked) => handleConfigChange('notifications', 'criticalAlerts', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Weekly Reports</p>
                      <p className="text-sm text-muted-foreground">Automated weekly summary reports</p>
                    </div>
                    <Switch
                      checked={config.notifications.weeklyReports}
                      onCheckedChange={(checked) => handleConfigChange('notifications', 'weeklyReports', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Maintenance Alerts</p>
                      <p className="text-sm text-muted-foreground">Notifications for scheduled maintenance</p>
                    </div>
                    <Switch
                      checked={config.notifications.maintenanceAlerts}
                      onCheckedChange={(checked) => handleConfigChange('notifications', 'maintenanceAlerts', checked)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Slack Webhook URL</label>
                    <Input
                      type="url"
                      value={config.notifications.slackWebhook || ''}
                      onChange={(e) => handleConfigChange('notifications', 'slackWebhook', e.target.value)}
                      placeholder="https://hooks.slack.com/services/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Discord Webhook URL</label>
                    <Input
                      type="url"
                      value={config.notifications.discordWebhook || ''}
                      onChange={(e) => handleConfigChange('notifications', 'discordWebhook', e.target.value)}
                      placeholder="https://discord.com/api/webhooks/..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Performance Settings
                </CardTitle>
                <CardDescription>System performance and optimization settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cache TTL (seconds)</label>
                    <Input
                      type="number"
                      value={config.performance.cacheTtl}
                      onChange={(e) => handleConfigChange('performance', 'cacheTtl', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Rate Limit (requests)</label>
                    <Input
                      type="number"
                      value={config.performance.rateLimitRequests}
                      onChange={(e) => handleConfigChange('performance', 'rateLimitRequests', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Rate Limit Window (seconds)</label>
                    <Input
                      type="number"
                      value={config.performance.rateLimitWindow}
                      onChange={(e) => handleConfigChange('performance', 'rateLimitWindow', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">DB Connection Pool Size</label>
                    <Input
                      type="number"
                      value={config.performance.databaseConnectionPool}
                      onChange={(e) => handleConfigChange('performance', 'databaseConnectionPool', parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable Compression</p>
                      <p className="text-sm text-muted-foreground">Compress API responses</p>
                    </div>
                    <Switch
                      checked={config.performance.enableCompression}
                      onCheckedChange={(checked) => handleConfigChange('performance', 'enableCompression', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable Caching</p>
                      <p className="text-sm text-muted-foreground">Cache frequently accessed data</p>
                    </div>
                    <Switch
                      checked={config.performance.enableCaching}
                      onCheckedChange={(checked) => handleConfigChange('performance', 'enableCaching', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wrench className="h-5 w-5 mr-2" />
                  Feature Flags
                </CardTitle>
                <CardDescription>Enable or disable system features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Analytics</p>
                      <p className="text-sm text-muted-foreground">Enable analytics dashboard and reporting</p>
                    </div>
                    <Switch
                      checked={config.features.analyticsEnabled}
                      onCheckedChange={(checked) => handleConfigChange('features', 'analyticsEnabled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Audit Logging</p>
                      <p className="text-sm text-muted-foreground">Log all administrative actions</p>
                    </div>
                    <Switch
                      checked={config.features.auditLoggingEnabled}
                      onCheckedChange={(checked) => handleConfigChange('features', 'auditLoggingEnabled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">API Access</p>
                      <p className="text-sm text-muted-foreground">Enable external API access</p>
                    </div>
                    <Switch
                      checked={config.features.apiAccessEnabled}
                      onCheckedChange={(checked) => handleConfigChange('features', 'apiAccessEnabled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Bulk Operations</p>
                      <p className="text-sm text-muted-foreground">Allow bulk server operations</p>
                    </div>
                    <Switch
                      checked={config.features.bulkOperationsEnabled}
                      onCheckedChange={(checked) => handleConfigChange('features', 'bulkOperationsEnabled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Advanced Filtering</p>
                      <p className="text-sm text-muted-foreground">Enable advanced search and filtering</p>
                    </div>
                    <Switch
                      checked={config.features.advancedFiltering}
                      onCheckedChange={(checked) => handleConfigChange('features', 'advancedFiltering', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Real-time Updates</p>
                      <p className="text-sm text-muted-foreground">Enable live data updates via WebSocket</p>
                    </div>
                    <Switch
                      checked={config.features.realTimeUpdates}
                      onCheckedChange={(checked) => handleConfigChange('features', 'realTimeUpdates', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 