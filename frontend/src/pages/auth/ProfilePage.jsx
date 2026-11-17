import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Save, UserCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api, { getErrorMessage } from '../../services/api';
import { ROLE_LABELS } from '../../utils/formatters';

export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();

  const profileForm = useForm({
    defaultValues: {
      name: user?.name || '',
      phone: user?.employee?.phone || '',
      street: user?.employee?.address?.street || '',
      city: user?.employee?.address?.city || '',
      state: user?.employee?.address?.state || '',
      country: user?.employee?.address?.country || '',
      emergencyName: user?.employee?.emergencyContact?.name || '',
      emergencyRelationship: user?.employee?.emergencyContact?.relationship || '',
      emergencyPhone: user?.employee?.emergencyContact?.phone || '',
    },
  });

  const passwordForm = useForm({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSaveProfile = async (values) => {
    try {
      await api.put('/auth/me', {
        name: values.name,
        phone: values.phone,
        address: {
          street: values.street,
          city: values.city,
          state: values.state,
          country: values.country,
        },
        emergencyContact: {
          name: values.emergencyName,
          relationship: values.emergencyRelationship,
          phone: values.emergencyPhone,
        },
      });
      await refreshUser();
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const onChangePassword = async (values) => {
    try {
      await api.post('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success('Password changed. Please sign in again.');
      await logout();
      navigate('/login');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Profile &amp; Security</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your personal contact information and account credentials.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
            <UserCircle className="w-6 h-6 text-blue-700" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">Account &amp; Contact Information</h2>
              <p className="text-xs text-slate-500">
                Role: {ROLE_LABELS[user?.role]} • Email: {user?.email}
              </p>
            </div>
          </div>

          <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-text">Display Name</label>
              <input className="input-field" {...profileForm.register('name', { required: 'Name is required' })} />
            </div>
            <div>
              <label className="label-text">Phone Number</label>
              <input className="input-field" {...profileForm.register('phone')} />
            </div>
            <div className="sm:col-span-2">
              <label className="label-text">Street Address</label>
              <input className="input-field" {...profileForm.register('street')} />
            </div>
            <div>
              <label className="label-text">City</label>
              <input className="input-field" {...profileForm.register('city')} />
            </div>
            <div>
              <label className="label-text">State / Country</label>
              <div className="grid grid-cols-2 gap-2">
                <input className="input-field" placeholder="State" {...profileForm.register('state')} />
                <input className="input-field" placeholder="Country" {...profileForm.register('country')} />
              </div>
            </div>
            <div>
              <label className="label-text">Emergency Contact Name</label>
              <input className="input-field" {...profileForm.register('emergencyName')} />
            </div>
            <div>
              <label className="label-text">Emergency Contact Phone</label>
              <input className="input-field" {...profileForm.register('emergencyPhone')} />
            </div>
            <div className="sm:col-span-2 flex justify-end pt-2">
              <button type="submit" disabled={profileForm.formState.isSubmitting} className="btn-primary">
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </div>
          </form>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
            <KeyRound className="w-5 h-5 text-blue-700" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">Change Password</h2>
              <p className="text-xs text-slate-500">Requires your current password</p>
            </div>
          </div>

          <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="mt-5 space-y-4">
            <div>
              <label className="label-text">Current Password</label>
              <input
                type="password"
                className="input-field"
                {...passwordForm.register('currentPassword', { required: 'Current password is required' })}
              />
            </div>
            <div>
              <label className="label-text">New Password</label>
              <input
                type="password"
                className="input-field"
                {...passwordForm.register('newPassword', {
                  required: 'New password is required',
                  minLength: { value: 8, message: 'At least 8 characters' },
                })}
              />
              {passwordForm.formState.errors.newPassword && (
                <p className="mt-1 text-xs text-red-600">{passwordForm.formState.errors.newPassword.message}</p>
              )}
            </div>
            <div>
              <label className="label-text">Confirm New Password</label>
              <input
                type="password"
                className="input-field"
                {...passwordForm.register('confirmPassword', {
                  validate: (v) => v === passwordForm.watch('newPassword') || 'Passwords must match',
                })}
              />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{passwordForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            <button type="submit" disabled={passwordForm.formState.isSubmitting} className="btn-primary w-full">
              Update Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
