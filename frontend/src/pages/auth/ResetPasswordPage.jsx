import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { ArrowLeft, KeyRound } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      token: searchParams.get('token') || '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values) => {
    try {
      const res = await api.post('/auth/reset-password', {
        token: values.token,
        password: values.password,
      });
      toast.success(res.data.message);
      navigate('/login');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md card p-8">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Set New Password</h2>
            <p className="text-xs text-slate-500">Choose a strong password (minimum 8 characters).</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="label-text">Reset Token</label>
            <input
              type="text"
              className="input-field"
              {...register('token', { required: 'Reset token is required' })}
            />
            {errors.token && <p className="mt-1 text-xs text-red-600">{errors.token.message}</p>}
          </div>

          <div>
            <label className="label-text">New Password</label>
            <input
              type="password"
              className="input-field"
              {...register('password', {
                required: 'New password is required',
                minLength: { value: 8, message: 'Minimum 8 characters required' },
              })}
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <div>
            <label className="label-text">Confirm Password</label>
            <input
              type="password"
              className="input-field"
              {...register('confirmPassword', {
                validate: (val) => val === watch('password') || 'Passwords do not match',
              })}
            />
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
