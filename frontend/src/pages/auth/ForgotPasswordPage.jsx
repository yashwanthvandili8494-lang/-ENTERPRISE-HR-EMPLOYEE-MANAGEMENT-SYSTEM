import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { ArrowLeft, Mail } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';

export default function ForgotPasswordPage() {
  const [devToken, setDevToken] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (values) => {
    try {
      const res = await api.post('/auth/forgot-password', values);
      setSubmitted(true);
      if (res.data?.data?.devResetToken) {
        setDevToken(res.data.data.devResetToken);
      }
      toast.success(res.data.message);
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
        <h2 className="text-2xl font-bold text-slate-900">Reset your password</h2>
        <p className="mt-1.5 text-sm text-slate-500">
          Enter your corporate email address and we will issue password reset instructions.
        </p>

        {submitted ? (
          <div className="mt-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 space-y-2">
            <p className="font-medium">Reset request processed.</p>
            <p className="text-xs text-emerald-700">
              If an active account matches that email, a reset link/token has been issued.
            </p>
            {devToken && (
              <div className="pt-2 border-t border-emerald-200">
                <p className="text-xs font-semibold text-slate-800">Development Mode Reset Token:</p>
                <code className="block mt-1 p-2 bg-white rounded border text-[11px] break-all text-slate-800">
                  {devToken}
                </code>
                <Link
                  to={`/reset-password?token=${encodeURIComponent(devToken)}`}
                  className="btn-primary w-full mt-3 text-xs"
                >
                  Continue to Reset Password
                </Link>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <label className="label-text">Work Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  className="input-field pl-9"
                  placeholder="name@company.com"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /^\S+@\S+\.\S+$/, message: 'Valid email is required' },
                  })}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? 'Submitting...' : 'Send Reset Instructions'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
