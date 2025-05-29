import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import ScreenshotAnalysis from '@/components/screenshot-analysis';

export default function ChatAnalysisPage() {
  const { user } = useAuth();
  const [deviceId, setDeviceId] = useState('');

  useEffect(() => {
    // Generate or retrieve device ID for anonymous users
    let id = localStorage.getItem('deviceId');
    if (!id) {
      id = 'device_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', id);
    }
    setDeviceId(id);
  }, []);

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <ScreenshotAnalysis 
        user={user}
        selectedTier={user?.tier || 'free'}
        deviceId={deviceId}
      />
    </div>
  );
}