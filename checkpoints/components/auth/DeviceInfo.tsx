//Path: components/auth/DeviceInfo.tsx

'use client';

import { Monitor, MapPin, Clock, Wifi, AlertCircle } from 'lucide-react';

// Interface matching SDK response structure
interface DeviceInfoProps {
  deviceInfo: {
    ip_address: string;
    browser?: string;
    os?: string;
    location?: string;
    timestamp: string;
    device_id?: string;
    user_agent?: string;
  };
  loading?: boolean;
  error?: string | null;
}

export default function DeviceInfo({ deviceInfo, loading, error }: DeviceInfoProps) {
  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch {
      return timestamp; // Fallback if parsing fails
    }
  };

  const getDeviceString = () => {
    if (deviceInfo.browser && deviceInfo.os) {
      return `${deviceInfo.browser} on ${deviceInfo.os}`;
    }
    if (deviceInfo.user_agent) {
      // Extract browser info from user agent if available
      const browserMatch = deviceInfo.user_agent.match(/(Chrome|Firefox|Safari|Edge)\/[\d.]+/);
      return browserMatch ? browserMatch[0] : 'Unknown browser';
    }
    return 'Unknown device';
  };

  if (loading) {
    return (
      <div className="bg-muted/50 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-4 w-4 bg-muted rounded"></div>
                <div className="space-y-1 flex-1">
                  <div className="h-3 bg-muted rounded w-1/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 rounded-xl p-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm font-medium">Failed to load device information</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-muted/50 rounded-xl p-6 space-y-4">
      <h3 className="font-semibold text-center mb-4">Device Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="flex items-start gap-2">
          <Wifi className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-medium">IP Address</p>
            <p className="text-muted-foreground break-all">
              {deviceInfo.ip_address || 'Unknown'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-medium">Location</p>
            <p className="text-muted-foreground">
              {deviceInfo.location || 'Unknown location'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Monitor className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-medium">Device</p>
            <p className="text-muted-foreground break-words">
              {getDeviceString()}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-medium">Login Attempt</p>
            <p className="text-muted-foreground">
              {formatTimestamp(deviceInfo.timestamp)}
            </p>
          </div>
        </div>
      </div>

      {deviceInfo.device_id && (
        <div className="pt-2 mt-4 border-t border-muted">
          <p className="text-xs text-muted-foreground">
            Device ID: <span className="font-mono">{deviceInfo.device_id}</span>
          </p>
        </div>
      )}
    </div>
  );
}