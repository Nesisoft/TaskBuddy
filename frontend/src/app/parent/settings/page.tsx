'use client';

import { useEffect, useState } from 'react';
import {
  Settings,
  Users,
  Bell,
  Shield,
  Palette,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ParentLayout } from '@/components/layouts/ParentLayout';
import { familyApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';

interface FamilySettings {
  id: string;
  familyName: string;
  settings?: {
    allowChildRewardRequests: boolean;
    requirePhotoProof: boolean;
    autoApproveEasyTasks: boolean;
    weeklyPointsReset: boolean;
    timezone: string;
  };
}

export default function ParentSettingsPage() {
  const { user, logout } = useAuth();
  const { error: showError, success: showSuccess } = useToast();
  const [family, setFamily] = useState<FamilySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [settings, setSettings] = useState({
    familyName: '',
    allowChildRewardRequests: true,
    requirePhotoProof: false,
    autoApproveEasyTasks: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await familyApi.getFamily();
      const data = response.data as FamilySettings;
      setFamily(data);
      setSettings({
        familyName: data?.familyName || '',
        allowChildRewardRequests: data?.settings?.allowChildRewardRequests ?? true,
        requirePhotoProof: data?.settings?.requirePhotoProof ?? false,
        autoApproveEasyTasks: data?.settings?.autoApproveEasyTasks ?? false,
      });
    } catch {
      showError('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await familyApi.updateSettings(settings);
      showSuccess('Settings saved');
    } catch {
      showError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const copyFamilyCode = () => {
    if (family?.id) {
      navigator.clipboard.writeText(family.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showSuccess('Family code copied!');
    }
  };

  if (isLoading) {
    return (
      <ParentLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
        </div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-600 mt-1">Manage your family settings</p>
        </div>

        {/* Family Info */}
        <section className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="font-display font-bold text-lg text-slate-900">
              Family Information
            </h2>
          </div>

          <div className="space-y-4">
            <Input
              label="Family Name"
              value={settings.familyName}
              onChange={(e) => setSettings({ ...settings, familyName: e.target.value })}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Family Code
              </label>
              <div className="flex gap-2">
                <Input
                  value={family?.id || ''}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button variant="secondary" onClick={copyFamilyCode}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Share this code with your children so they can log in
              </p>
            </div>
          </div>
        </section>

        {/* Task Settings */}
        <section className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-success-100 flex items-center justify-center">
              <Settings className="w-5 h-5 text-success-600" />
            </div>
            <h2 className="font-display font-bold text-lg text-slate-900">
              Task Settings
            </h2>
          </div>

          <div className="space-y-4">
            <ToggleSetting
              label="Require Photo Proof"
              description="Children must submit a photo when completing tasks"
              checked={settings.requirePhotoProof}
              onChange={(checked) => setSettings({ ...settings, requirePhotoProof: checked })}
            />

            <ToggleSetting
              label="Auto-approve Easy Tasks"
              description="Automatically approve tasks marked as 'Easy'"
              checked={settings.autoApproveEasyTasks}
              onChange={(checked) => setSettings({ ...settings, autoApproveEasyTasks: checked })}
            />
          </div>
        </section>

        {/* Reward Settings */}
        <section className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gold-100 flex items-center justify-center">
              <Bell className="w-5 h-5 text-gold-600" />
            </div>
            <h2 className="font-display font-bold text-lg text-slate-900">
              Reward Settings
            </h2>
          </div>

          <div className="space-y-4">
            <ToggleSetting
              label="Allow Reward Requests"
              description="Children can request new rewards to be added"
              checked={settings.allowChildRewardRequests}
              onChange={(checked) => setSettings({ ...settings, allowChildRewardRequests: checked })}
            />
          </div>
        </section>

        {/* Account Info */}
        <section className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-slate-600" />
            </div>
            <h2 className="font-display font-bold text-lg text-slate-900">
              Account
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500">Logged in as</p>
              <p className="font-medium text-slate-900">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>

            <Button variant="destructive" onClick={logout}>
              Sign Out
            </Button>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button size="lg" onClick={handleSave} loading={isSaving}>
            Save Changes
          </Button>
        </div>
      </div>
    </ParentLayout>
  );
}

// Toggle Setting Component
function ToggleSetting({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
      <div>
        <p className="font-medium text-slate-900">{label}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <input
        type="checkbox"
        className="w-5 h-5 rounded text-primary-600"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
