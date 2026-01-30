'use client';

import { useEffect, useState } from 'react';
import {
  Settings,
  Users,
  Bell,
  Shield,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ParentLayout } from '@/components/layouts/ParentLayout';
import { familyApi, authApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';

interface Family {
  id: string;
  familyName: string;
  settings?: {
    autoApproveRecurringTasks: boolean;
    enableDailyChallenges: boolean;
    enableLeaderboard: boolean;
    streakGracePeriodHours: number;
  };
}

interface FamilySettingsData {
  autoApproveRecurringTasks: boolean;
  enableDailyChallenges: boolean;
  enableLeaderboard: boolean;
  streakGracePeriodHours: number;
}

export default function ParentSettingsPage() {
  const { user, logout } = useAuth();
  const { error: showError, success: showSuccess } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [familyId, setFamilyId] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [familySettings, setFamilySettings] = useState<FamilySettingsData>({
    autoApproveRecurringTasks: false,
    enableDailyChallenges: true,
    enableLeaderboard: false,
    streakGracePeriodHours: 4,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load family info and settings in parallel
      const [familyRes, settingsRes] = await Promise.all([
        familyApi.getFamily(),
        familyApi.getSettings(),
      ]);

      // Extract family data from nested response: { family: { id, familyName, ... } }
      const familyData = (familyRes.data as { family: Family }).family;
      if (familyData) {
        setFamilyId(familyData.id);
        setFamilyName(familyData.familyName || '');
      }

      // Extract settings data from nested response: { settings: { ... } }
      const settingsData = (settingsRes.data as { settings: FamilySettingsData }).settings;
      if (settingsData) {
        setFamilySettings({
          autoApproveRecurringTasks: settingsData.autoApproveRecurringTasks ?? false,
          enableDailyChallenges: settingsData.enableDailyChallenges ?? true,
          enableLeaderboard: settingsData.enableLeaderboard ?? false,
          streakGracePeriodHours: settingsData.streakGracePeriodHours ?? 4,
        });
      }
    } catch {
      showError('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save family name and settings in parallel
      await Promise.all([
        familyApi.updateFamily({ familyName }),
        familyApi.updateSettings(familySettings),
      ]);
      showSuccess('Settings saved');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save settings';
      showError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const copyFamilyCode = () => {
    if (familyId) {
      navigator.clipboard.writeText(familyId);
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
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Family Code
              </label>
              <div className="flex gap-2">
                <Input
                  value={familyId}
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
              label="Auto-approve Recurring Tasks"
              description="Automatically approve recurring tasks when completed"
              checked={familySettings.autoApproveRecurringTasks}
              onChange={(checked) => setFamilySettings({ ...familySettings, autoApproveRecurringTasks: checked })}
            />

            <ToggleSetting
              label="Enable Daily Challenges"
              description="Show daily challenge tasks for children"
              checked={familySettings.enableDailyChallenges}
              onChange={(checked) => setFamilySettings({ ...familySettings, enableDailyChallenges: checked })}
            />

            <ToggleSetting
              label="Enable Leaderboard"
              description="Show a leaderboard ranking among siblings"
              checked={familySettings.enableLeaderboard}
              onChange={(checked) => setFamilySettings({ ...familySettings, enableLeaderboard: checked })}
            />
          </div>
        </section>

        {/* Gamification Settings */}
        <section className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gold-100 flex items-center justify-center">
              <Bell className="w-5 h-5 text-gold-600" />
            </div>
            <h2 className="font-display font-bold text-lg text-slate-900">
              Gamification
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Streak Grace Period (hours)
              </label>
              <Input
                type="number"
                min={0}
                max={12}
                value={familySettings.streakGracePeriodHours}
                onChange={(e) =>
                  setFamilySettings({
                    ...familySettings,
                    streakGracePeriodHours: parseInt(e.target.value) || 0,
                  })
                }
              />
              <p className="text-sm text-slate-500 mt-1">
                Extra hours before a streak is broken (0-12)
              </p>
            </div>
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

            <ChangePasswordForm />

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

// Change Password Form Component
function ChangePasswordForm() {
  const { error: showError, success: showSuccess } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      showError('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('New passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      showSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to change password';
      showError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <Button variant="secondary" onClick={() => setIsOpen(true)}>
        Change Password
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 rounded-xl border border-slate-200 bg-slate-50">
      <h3 className="font-medium text-slate-900">Change Password</h3>
      <Input
        label="Current Password"
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        required
      />
      <Input
        label="New Password"
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        required
        placeholder="At least 8 characters"
      />
      <Input
        label="Confirm New Password"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={isSubmitting}>
          Update Password
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsOpen(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
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
