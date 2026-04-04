import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { setReminderPreferences, getReminderPreferences, type ReminderPreference } from '@/services/anti-fraud';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Clock, MapPin, CreditCard, Plus, Trash2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReminderPreferencesProps {
  bookingId: string;
  eventDate?: string;
}

interface ReminderForm {
  reminder_type: 'event_start' | 'payment_due' | 'location_share' | 'custom';
  minutes_before: number;
  is_enabled: boolean;
  custom_message?: string;
  notification_methods: string[];
}

const reminderTypeLabels = {
  event_start: 'Event Start',
  payment_due: 'Payment Due',
  location_share: 'Location Share',
  custom: 'Custom Reminder',
};

const reminderTypeIcons = {
  event_start: Clock,
  payment_due: CreditCard,
  location_share: MapPin,
  custom: Bell,
};

const timeOptions = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' },
  { value: 480, label: '8 hours' },
  { value: 1440, label: '1 day' },
  { value: 2880, label: '2 days' },
  { value: 10080, label: '1 week' },
];

export function ReminderPreferences({ bookingId, eventDate }: ReminderPreferencesProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<ReminderPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newReminder, setNewReminder] = useState<ReminderForm>({
    reminder_type: 'event_start',
    minutes_before: 60,
    is_enabled: true,
    custom_message: '',
    notification_methods: ['in_app'],
  });

  useEffect(() => {
    loadPreferences();
  }, [bookingId]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const data = await getReminderPreferences(user.id, bookingId);
      setPreferences(data);
    } catch (error) {
      console.error('Error loading reminder preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const preferencesToSave = preferences.map(pref => ({
        reminder_type: pref.reminder_type,
        minutes_before: pref.minutes_before,
        is_enabled: pref.is_enabled,
        custom_message: pref.custom_message,
        notification_methods: pref.notification_methods,
      }));

      const success = await setReminderPreferences(user.id, bookingId, preferencesToSave);
      
      if (success) {
        toast({
          title: 'Preferences Saved',
          description: 'Your reminder preferences have been updated.',
        });
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save reminder preferences.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddReminder = () => {
    const id = `temp-${Date.now()}`;
    const newPref: ReminderPreference = {
      id,
      user_id: user?.id || '',
      booking_id: bookingId,
      ...newReminder,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setPreferences(prev => [...prev, newPref]);
    setNewReminder({
      reminder_type: 'event_start',
      minutes_before: 60,
      is_enabled: true,
      custom_message: '',
      notification_methods: ['in_app'],
    });
    setShowAddForm(false);
  };

  const handleRemoveReminder = (id: string) => {
    setPreferences(prev => prev.filter(pref => pref.id !== id));
  };

  const handleUpdateReminder = (id: string, updates: Partial<ReminderPreference>) => {
    setPreferences(prev => 
      prev.map(pref => 
        pref.id === id ? { ...pref, ...updates } : pref
      )
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Reminder Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!eventDate && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              Event date not set. Reminders will be scheduled once the event date is confirmed.
            </p>
          </div>
        )}

        {/* Existing Reminders */}
        <div className="space-y-3">
          {preferences.map((pref) => {
            const Icon = reminderTypeIcons[pref.reminder_type];
            return (
              <div key={pref.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">
                      {reminderTypeLabels[pref.reminder_type]}
                    </span>
                    <Badge variant={pref.is_enabled ? 'default' : 'secondary'}>
                      {pref.is_enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <Button
                    onClick={() => handleRemoveReminder(pref.id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Remind me
                    </label>
                    <Select
                      value={pref.minutes_before.toString()}
                      onValueChange={(value) => 
                        handleUpdateReminder(pref.id, { minutes_before: parseInt(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map(option => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label} before
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={pref.is_enabled}
                      onCheckedChange={(checked) => 
                        handleUpdateReminder(pref.id, { is_enabled: checked })
                      }
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Enable reminder
                    </label>
                  </div>
                </div>

                {pref.reminder_type === 'custom' && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Custom Message
                    </label>
                    <Textarea
                      value={pref.custom_message || ''}
                      onChange={(e) => 
                        handleUpdateReminder(pref.id, { custom_message: e.target.value })
                      }
                      placeholder="Enter your custom reminder message"
                      rows={2}
                    />
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Notification Methods
                  </label>
                  <div className="flex gap-2">
                    {['in_app', 'email', 'sms'].map(method => (
                      <Button
                        key={method}
                        variant={pref.notification_methods.includes(method) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          const methods = pref.notification_methods.includes(method)
                            ? pref.notification_methods.filter(m => m !== method)
                            : [...pref.notification_methods, method];
                          handleUpdateReminder(pref.id, { notification_methods: methods });
                        }}
                      >
                        {method === 'in_app' && 'In-App'}
                        {method === 'email' && 'Email'}
                        {method === 'sms' && 'SMS'}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add New Reminder Form */}
        {showAddForm && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 space-y-3">
            <h4 className="font-medium">Add New Reminder</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Reminder Type
                </label>
                <Select
                  value={newReminder.reminder_type}
                  onValueChange={(value: any) => 
                    setNewReminder(prev => ({ ...prev, reminder_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(reminderTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Time Before
                </label>
                <Select
                  value={newReminder.minutes_before.toString()}
                  onValueChange={(value) => 
                    setNewReminder(prev => ({ ...prev, minutes_before: parseInt(value) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label} before
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newReminder.reminder_type === 'custom' && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Custom Message
                </label>
                <Textarea
                  value={newReminder.custom_message || ''}
                  onChange={(e) => 
                    setNewReminder(prev => ({ ...prev, custom_message: e.target.value }))
                  }
                  placeholder="Enter your custom reminder message"
                  rows={2}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => setShowAddForm(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddReminder}
                className="flex-1 gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Reminder
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          {!showAddForm && (
            <Button
              onClick={() => setShowAddForm(true)}
              variant="outline"
              className="flex-1 gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Reminder
            </Button>
          )}
          
          <Button
            onClick={handleSavePreferences}
            disabled={saving || preferences.length === 0}
            className="flex-1 gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>

        {preferences.length === 0 && !showAddForm && (
          <div className="text-center py-6 text-gray-500">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No reminders set up yet</p>
            <p className="text-xs">Add reminders to stay updated about your event</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}