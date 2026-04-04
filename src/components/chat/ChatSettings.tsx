import React from 'react';
import { useChat } from '@/contexts/ChatContext';
import { notificationService } from '@/services/notifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Bell,
  Shield,
  Eye,
  Volume2,
  Monitor,
  Lock,
  UserCheck,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ChatSettings = () => {
  const { chatSettings, updateChatSettings, isEncryptionEnabled, initializeEncryption } = useChat();
  const { toast } = useToast();

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      try {
        const permission = await notificationService.requestPermission();
        if (permission === 'granted') {
          updateChatSettings({
            notifications: { ...chatSettings.notifications, enabled: true },
          });
          toast({
            title: 'Notifications enabled',
            description: "You'll receive notifications for new messages",
          });
        } else {
          toast({
            title: 'Permission denied',
            description: 'Please enable notifications in your browser settings',
            variant: 'destructive',
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to enable notifications',
          variant: 'destructive',
        });
      }
    } else {
      updateChatSettings({
        notifications: { ...chatSettings.notifications, enabled: false },
      });
    }
  };

  const handleEncryptionToggle = async (enabled: boolean) => {
    if (enabled && !isEncryptionEnabled) {
      try {
        const success = await initializeEncryption();
        if (success) {
          updateChatSettings({
            encryption: { ...chatSettings.encryption, enabled: true },
          });
          toast({
            title: 'Encryption enabled',
            description: 'Your messages are now end-to-end encrypted',
          });
        } else {
          toast({
            title: 'Encryption failed',
            description: 'Could not initialize encryption',
            variant: 'destructive',
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to enable encryption',
          variant: 'destructive',
        });
      }
    } else {
      updateChatSettings({
        encryption: { ...chatSettings.encryption, enabled },
      });
    }
  };

  const getNotificationStatus = () => {
    if (!notificationService.isNotificationSupported()) {
      return { status: 'unsupported', message: 'Not supported in this browser' };
    }

    const permission = notificationService.getPermissionStatus();
    switch (permission) {
      case 'granted':
        return { status: 'granted', message: 'Enabled' };
      case 'denied':
        return { status: 'denied', message: 'Blocked by browser' };
      default:
        return { status: 'default', message: 'Permission required' };
    }
  };

  const notificationStatus = getNotificationStatus();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold">Chat Settings</h2>
        <p className="text-muted-foreground">
          Configure your chat preferences and security settings
        </p>
      </div>

      {/* Notifications Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Control how you receive notifications for new messages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="notifications-enabled">Enable notifications</Label>
              <div className="flex items-center gap-2">
                <Badge
                  variant={notificationStatus.status === 'granted' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {notificationStatus.message}
                </Badge>
              </div>
            </div>
            <Switch
              id="notifications-enabled"
              checked={chatSettings.notifications.enabled}
              onCheckedChange={handleNotificationToggle}
              disabled={notificationStatus.status === 'unsupported'}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                <Label htmlFor="notification-sound">Sound notifications</Label>
              </div>
              <Switch
                id="notification-sound"
                checked={chatSettings.notifications.sound}
                onCheckedChange={(checked) =>
                  updateChatSettings({
                    notifications: { ...chatSettings.notifications, sound: checked },
                  })
                }
                disabled={!chatSettings.notifications.enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                <Label htmlFor="desktop-notifications">Desktop notifications</Label>
              </div>
              <Switch
                id="desktop-notifications"
                checked={chatSettings.notifications.desktop}
                onCheckedChange={(checked) =>
                  updateChatSettings({
                    notifications: { ...chatSettings.notifications, desktop: checked },
                  })
                }
                disabled={!chatSettings.notifications.enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <Label htmlFor="message-preview">Show message preview</Label>
              </div>
              <Switch
                id="message-preview"
                checked={chatSettings.notifications.preview}
                onCheckedChange={(checked) =>
                  updateChatSettings({
                    notifications: { ...chatSettings.notifications, preview: checked },
                  })
                }
                disabled={!chatSettings.notifications.enabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Encryption Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            End-to-End Encryption
          </CardTitle>
          <CardDescription>Secure your messages with end-to-end encryption</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="encryption-enabled">Enable encryption</Label>
              <div className="flex items-center gap-2">
                <Badge variant={isEncryptionEnabled ? 'default' : 'secondary'} className="text-xs">
                  {isEncryptionEnabled ? 'Active' : 'Inactive'}
                </Badge>
                {isEncryptionEnabled && <CheckCircle className="h-4 w-4 text-green-600" />}
              </div>
            </div>
            <Switch
              id="encryption-enabled"
              checked={chatSettings.encryption.enabled}
              onCheckedChange={handleEncryptionToggle}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <Label htmlFor="auto-encrypt">Auto-encrypt new messages</Label>
            </div>
            <Switch
              id="auto-encrypt"
              checked={chatSettings.encryption.autoEncrypt}
              onCheckedChange={(checked) =>
                updateChatSettings({
                  encryption: { ...chatSettings.encryption, autoEncrypt: checked },
                })
              }
              disabled={!chatSettings.encryption.enabled}
            />
          </div>

          {chatSettings.encryption.enabled && (
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium">Encryption is active</p>
                  <p className="text-xs mt-1">
                    Your messages are encrypted using RSA-2048 encryption. Only you and the
                    recipient can read them.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Privacy
          </CardTitle>
          <CardDescription>Control what information you share with other users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <Label htmlFor="read-receipts">Send read receipts</Label>
            </div>
            <Switch
              id="read-receipts"
              checked={chatSettings.privacy.readReceipts}
              onCheckedChange={(checked) =>
                updateChatSettings({
                  privacy: { ...chatSettings.privacy, readReceipts: checked },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              <Label htmlFor="online-status">Show online status</Label>
            </div>
            <Switch
              id="online-status"
              checked={chatSettings.privacy.onlineStatus}
              onCheckedChange={(checked) =>
                updateChatSettings({
                  privacy: { ...chatSettings.privacy, onlineStatus: checked },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <Label htmlFor="typing-indicators">Show typing indicators</Label>
            </div>
            <Switch
              id="typing-indicators"
              checked={chatSettings.privacy.typingIndicators}
              onCheckedChange={(checked) =>
                updateChatSettings({
                  privacy: { ...chatSettings.privacy, typingIndicators: checked },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Test Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Test Settings</CardTitle>
          <CardDescription>Test your notification and sound settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (chatSettings.notifications.enabled) {
                  notificationService.notifyNewMessage(
                    'Test Contact',
                    'This is a test notification',
                    999,
                    'test-msg-id'
                  );
                } else {
                  toast({
                    title: 'Notifications disabled',
                    description: 'Enable notifications to test',
                    variant: 'destructive',
                  });
                }
              }}
            >
              Test Notification
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                if (chatSettings.notifications.sound) {
                  notificationService.playNotificationSound();
                } else {
                  toast({
                    title: 'Sound disabled',
                    description: 'Enable notification sounds to test',
                    variant: 'destructive',
                  });
                }
              }}
            >
              Test Sound
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatSettings;
