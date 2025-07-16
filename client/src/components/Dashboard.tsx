import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Calendar, 
  MessageCircle, 
  Zap, 
  CheckCircle, 
  AlertCircle,
  Play,
  Pause,
  RefreshCw,
  Send
} from 'lucide-react';

interface CalendarEvent {
  id: number;
  summary: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  eventType: string;
  location?: string;
}

interface SummaryData {
  summary: string;
  events: CalendarEvent[];
}

interface AutomationStatus {
  automationEnabled: boolean;
  dailySummaryTime: string;
  timezone: string;
}

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [automationStatus, setAutomationStatus] = useState<AutomationStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [testing, setTesting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async (): Promise<void> => {
    try {
      setLoading(true);
      const [summaryRes, statusRes] = await Promise.all([
        axios.get<SummaryData>('/calendar/today'),
        axios.get<AutomationStatus>('/automation/status')
      ]);
      
      setSummary(summaryRes.data);
      setAutomationStatus(statusRes.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartAutomation = async (): Promise<void> => {
    try {
      await axios.post('/automation/start');
      await loadDashboard();
    } catch (error) {
      console.error('Failed to start automation:', error);
    }
  };

  const handleStopAutomation = async (): Promise<void> => {
    try {
      await axios.post('/automation/stop');
      await loadDashboard();
    } catch (error) {
      console.error('Failed to stop automation:', error);
    }
  };

  const handleTestAutomation = async (): Promise<void> => {
    try {
      setTesting(true);
      const response = await axios.post('/automation/test');
      console.log('Test result:', response.data);
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setTesting(false);
    }
  };

  const handleTriggerSummary = async (): Promise<void> => {
    try {
      const response = await axios.post<{ success: boolean; error?: string }>('/automation/trigger-summary');
      if (response.data.success) {
        alert('Daily summary sent successfully!');
      } else {
        alert('Failed to send summary: ' + response.data.error);
      }
    } catch (error) {
      console.error('Failed to trigger summary:', error);
      alert('Failed to send summary');
    }
  };

  const handlePreviewSummary = async (): Promise<void> => {
    try {
      const response = await axios.post<{ success: boolean; summary?: string; error?: string }>('/whatsapp/preview-summary');
      if (response.data.success && response.data.summary) {
        alert('WhatsApp Message Preview:\n\n' + response.data.summary);
      } else {
        alert('Failed to preview summary: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to preview summary:', error);
      alert('Failed to preview summary');
    }
  };

  const handleEnableAutomation = async (): Promise<void> => {
    try {
      const response = await axios.post<{ success: boolean; error?: string }>('/automation/debug/enable');
      if (response.data.success) {
        alert('Automation enabled! Try "Send Summary Now" again.');
        await loadDashboard(); // Refresh the dashboard
      } else {
        alert('Failed to enable automation: ' + response.data.error);
      }
    } catch (error) {
      console.error('Failed to enable automation:', error);
      alert('Failed to enable automation');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={loadDashboard}
          className="btn-secondary flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="card border-error-200 bg-error-50">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-error-600" />
            <span className="text-error-800">{error}</span>
          </div>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Calendar Status */}
        <div className="card">
          <div className="flex items-center space-x-3">
            <Calendar className="w-8 h-8 text-primary-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Calendar</h3>
              <p className="text-sm text-gray-600">Google Calendar connected</p>
            </div>
            <CheckCircle className="w-5 h-5 text-success-600 ml-auto" />
          </div>
        </div>

        {/* WhatsApp Status */}
        <div className="card">
          <div className="flex items-center space-x-3">
            <MessageCircle className="w-8 h-8 text-success-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">WhatsApp</h3>
              <p className="text-sm text-gray-600">Business API connected</p>
            </div>
            <CheckCircle className="w-5 h-5 text-success-600 ml-auto" />
          </div>
        </div>

        {/* Automation Status */}
        <div className="card">
          <div className="flex items-center space-x-3">
            <Zap className="w-8 h-8 text-warning-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Automation</h3>
              <p className="text-sm text-gray-600">
                {automationStatus?.automationEnabled ? 'Active' : 'Inactive'}
              </p>
            </div>
            {automationStatus?.automationEnabled ? (
              <CheckCircle className="w-5 h-5 text-success-600 ml-auto" />
            ) : (
              <AlertCircle className="w-5 h-5 text-warning-600 ml-auto" />
            )}
          </div>
        </div>
      </div>

      {/* Today's Summary */}
      {summary && (
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <Calendar className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Today's Schedule</h2>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
              {summary.summary}
            </pre>
          </div>

          {/* Event List */}
          {summary.events && summary.events.length > 0 && (
            <div className="mt-4">
              <table className="min-w-full text-sm text-left">
                <thead>
                  <tr>
                    <th className="px-2 py-1">Time</th>
                    <th className="px-2 py-1">Title</th>
                    {/* <th className="px-2 py-1">Type</th> */}
                    <th className="px-2 py-1">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.events.map(event => {
                    const start = new Date(event.startTime);
                    const end = new Date(event.endTime);
                    const timeStr = event.allDay
                      ? 'All Day'
                      : `${start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
                    return (
                      <tr key={event.id} className="border-b last:border-0">
                        <td className="px-2 py-1 whitespace-nowrap">{timeStr}</td>
                        <td className="px-2 py-1">{event.summary}</td>
                        {/* <td className="px-2 py-1">{event.eventType}</td> */}
                        <td className="px-2 py-1">{event.location}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="mt-4 flex space-x-3">
            <button
              onClick={handleTriggerSummary}
              className="btn-primary flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Send Summary Now</span>
            </button>
            <button
              onClick={handlePreviewSummary}
              className="btn-secondary flex items-center space-x-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Preview Summary</span>
            </button>
            {!automationStatus?.automationEnabled && (
              <button
                onClick={handleEnableAutomation}
                className="btn-secondary flex items-center space-x-2"
              >
                <Zap className="w-4 h-4" />
                <span>Enable Automation</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Automation Controls */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Zap className="w-5 h-5 text-warning-600" />
          <h2 className="text-xl font-semibold text-gray-900">Automation Controls</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Status</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Automation:</span>
                <span className={automationStatus?.automationEnabled ? 'text-success-600' : 'text-warning-600'}>
                  {automationStatus?.automationEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Daily Summary Time:</span>
                <span className="text-gray-900">{automationStatus?.dailySummaryTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Timezone:</span>
                <span className="text-gray-900">{automationStatus?.timezone}</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Controls</h3>
            <div className="space-y-3">
              {automationStatus?.automationEnabled ? (
                <button
                  onClick={handleStopAutomation}
                  className="w-full btn-error flex items-center justify-center space-x-2"
                >
                  <Pause className="w-4 h-4" />
                  <span>Stop Automation</span>
                </button>
              ) : (
                <button
                  onClick={handleStartAutomation}
                  className="w-full btn-success flex items-center justify-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Start Automation</span>
                </button>
              )}
              
              <button
                onClick={handleTestAutomation}
                disabled={testing}
                className="w-full btn-secondary flex items-center justify-center space-x-2"
              >
                {testing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                <span>{testing ? 'Testing...' : 'Test Connection'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 