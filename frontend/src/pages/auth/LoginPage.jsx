import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { Building2, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values) => {
    try {
      await login(values.email, values.password);
      toast.success('Signed in successfully');
      navigate('/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Invalid credentials'));
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left Enterprise Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-navy-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 via-navy-900 to-slate-950" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Enterprise HRMS</h1>
            <p className="text-xs text-blue-200">Workforce Operations Platform</p>
          </div>
        </div>

        <div className="relative z-10 max-w-lg">
          <h2 className="text-4xl font-bold leading-tight">
            Unified HR, Payroll, Attendance &amp; Talent Operations.
          </h2>
          <p className="mt-4 text-slate-300 text-base leading-relaxed">
            Built for modern enterprises with strict role-based security, real-time analytics, automated leave balances,
            and complete audit traceability.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <p className="text-sm font-semibold text-white">Role-Based Access</p>
              <p className="text-xs text-slate-400 mt-1">Super Admin, HR, Dept Manager &amp; Employee scopes</p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <p className="text-sm font-semibold text-white">Audit &amp; Compliance</p>
              <p className="text-xs text-slate-400 mt-1">Every critical HR action logged with timestamps</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span>Protected by JWT Authentication, HTTP-only Refresh Cookies &amp; RBAC</span>
        </div>
      </div>

      {/* Right Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center text-white">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Enterprise HRMS</h1>
              <p className="text-xs text-slate-500">Workforce Operations Platform</p>
            </div>
          </div>

          <div className="card p-8">
            <h2 className="text-2xl font-bold text-slate-900">Sign in to your account</h2>
            <p className="mt-1.5 text-sm text-slate-500">Enter your corporate credentials to access the HR portal.</p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
              <div>
                <label htmlFor="email" className="label-text">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@company.com"
                    className="input-field pl-9"
                    {...register('email', {
                      required: 'Email address is required',
                      pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' },
                    })}
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="label-text mb-0">
                    Password
                  </label>
                  <Link to="/forgot-password" className="text-xs font-medium text-blue-700 hover:text-blue-800">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="input-field pl-9 pr-10"
                    {...register('password', {
                      required: 'Password is required',
                      minLength: { value: 6, message: 'Password must be at least 6 characters' },
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
              </div>

              <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-2.5">
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
