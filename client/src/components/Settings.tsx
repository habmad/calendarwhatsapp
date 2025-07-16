import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Settings as SettingsIcon, 
  MessageCircle, 
  Clock, 
  Save,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface User {
  id: number;
  email: string;
  name: string;
  picture?: string;
  whatsappRecipients?: string[];
  automationEnabled?: boolean;
  dailySummaryTime?: string;
  timezone?: string;
}

interface FormData {
  whatsappRecipients: string[];
  automationEnabled: boolean;
  dailySummaryTime: string;
  timezone: string;
}

const Settings: React.FC = () => {
  const [, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    whatsappRecipients: [''],
    automationEnabled: true,
    dailySummaryTime: '08:00',
    timezone: 'America/New_York'
  });

  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await axios.get<User>('/auth/me');
      setUser(response.data);
      setFormData({
        whatsappRecipients: response.data.whatsappRecipients || [''],
        automationEnabled: response.data.automationEnabled !== false,
        dailySummaryTime: response.data.dailySummaryTime || '08:00',
        timezone: response.data.timezone || 'America/New_York'
      });
    } catch (error) {
      console.error('Failed to load user settings:', error);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async (): Promise<void> => {
    try {
      setSaving(true);
      setError(null);
      
      // Update user settings
      await axios.put('/auth/settings', {
        whatsappRecipients: formData.whatsappRecipients,
        automationEnabled: formData.automationEnabled,
        dailySummaryTime: formData.dailySummaryTime,
        timezone: formData.timezone
      });
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestWhatsApp = async (): Promise<void> => {
    try {
      const message = `🧪 Test message from GCal WhatsApp\n\nThis is a test message to verify your WhatsApp integration is working correctly.`;
      
      await axios.post('/whatsapp/send-test', {
        recipient: formData.whatsappRecipients[0],
        message
      });
      
      alert('Test message sent successfully!');
    } catch (error) {
      console.error('Failed to send test message:', error);
      alert('Failed to send test message. Please check your WhatsApp configuration.');
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
      <div className="flex items-center space-x-2">
        <SettingsIcon className="w-6 h-6 text-gray-600" />
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      {error && (
        <div className="card border-error-200 bg-error-50">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-error-600" />
            <span className="text-error-800">{error}</span>
          </div>
        </div>
      )}

      {saved && (
        <div className="card border-success-200 bg-success-50">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-success-600" />
            <span className="text-success-800">Settings saved successfully!</span>
          </div>
        </div>
      )}

      {/* WhatsApp Settings */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <MessageCircle className="w-5 h-5 text-success-600" />
          <h2 className="text-xl font-semibold text-gray-900">WhatsApp Settings</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="whatsappRecipient" className="label">
              WhatsApp Recipient Phone Number
            </label>
            <input
              type="tel"
              id="whatsappRecipient"
              name="whatsappRecipients"
              value={formData.whatsappRecipients[0] || ''}
              onChange={(e) => {
                const newRecipients = [...formData.whatsappRecipients];
                newRecipients[0] = e.target.value;
                setFormData(prev => ({
                  ...prev,
                  whatsappRecipients: newRecipients
                }));
              }}
              placeholder="+1234567890"
              className="input"
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter the phone number (with country code) that will receive the WhatsApp messages.
            </p>
          </div>

          <button
            onClick={handleTestWhatsApp}
            className="btn-secondary flex items-center space-x-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Send Test Message</span>
          </button>
        </div>
      </div>

      {/* Automation Settings */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Clock className="w-5 h-5 text-warning-600" />
          <h2 className="text-xl font-semibold text-gray-900">Automation Settings</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="automationEnabled"
              name="automationEnabled"
              checked={formData.automationEnabled}
              onChange={handleInputChange}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="automationEnabled" className="text-gray-700">
              Enable daily automation
            </label>
          </div>

          <div>
            <label htmlFor="dailySummaryTime" className="label">
              Daily Summary Time
            </label>
            <input
              type="time"
              id="dailySummaryTime"
              name="dailySummaryTime"
              value={formData.dailySummaryTime}
              onChange={handleInputChange}
              className="input"
            />
            <p className="text-sm text-gray-500 mt-1">
              Time when the daily summary will be sent (in your timezone).
            </p>
          </div>

          <div>
            <label htmlFor="timezone" className="label">
              Timezone
            </label>
            <select
              id="timezone"
              name="timezone"
              value={formData.timezone}
              onChange={handleInputChange}
              className="input"
            >
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
              <option value="Asia/Shanghai">Shanghai (CST)</option>
              <option value="Australia/Sydney">Sydney (AEDT)</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Your timezone for accurate scheduling.
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center space-x-2"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>
    </div>
  );
};

export default Settings; 