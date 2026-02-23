import React, { useState, useEffect } from 'react';
import { X, Save, Send } from 'lucide-react';
import axios from 'axios';

interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [config, setConfig] = useState<TelegramConfig>({
    botToken: '',
    chatId: '',
    enabled: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      axios.get('/api/config')
        .then(res => setConfig(res.data))
        .catch(err => console.error(err));
    }
  }, [isOpen]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.post('/api/config', config);
      onClose();
    } catch (error) {
      console.error('Failed to save config', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-gray-900/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Send size={20} className="text-blue-400" />
            إعدادات تلغرام (الخادم)
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-200">
            ملاحظة: يعمل البوت الآن على الخادم. ستصلك الإشعارات حتى لو أغلقت المتصفح.
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Bot Token</label>
              <input
                type="text"
                value={config.botToken}
                onChange={(e) => setConfig({ ...config, botToken: e.target.value })}
                placeholder="123456789:ABCdefGhIJKlmNoPQRstuVWxyz"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Chat ID</label>
              <input
                type="text"
                value={config.chatId}
                onChange={(e) => setConfig({ ...config, chatId: e.target.value })}
                placeholder="-100123456789"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                dir="ltr"
              />
            </div>

            <div className="flex items-center justify-between bg-gray-950 p-3 rounded-lg border border-gray-800">
              <span className="text-sm font-medium text-gray-300">تفعيل الإشعارات</span>
              <button
                onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  config.enabled ? 'bg-blue-500' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`${
                    config.enabled ? '-translate-x-6' : '-translate-x-1'
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-800 bg-gray-900/50 flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Save size={18} />
            {loading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </div>
    </div>
  );
}
