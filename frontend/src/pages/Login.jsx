import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth.api';
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import logoUrl from '@/assets/logo.png';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function Login() {
  const { setAuth, token } = useAuthStore();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  if (token) return <Navigate to="/" replace />;

  const onSubmit = async ({ email, password }) => {
    setServerError('');
    try {
      const { token, refreshToken, user } = await authApi.login(email, password);
      setAuth(token, refreshToken, user);
      navigate('/', { replace: true });
    } catch (err) {
      setServerError(err.response?.data?.error ?? 'Login failed. Check your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-white flex w-full">
      
      {/* ── Left Side (Branding/Visuals) ── */}
      <div className="hidden lg:flex w-[45%] bg-zinc-950 relative overflow-hidden text-white flex-col justify-between p-12">
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-30 pointer-events-none">
          <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-primary/40 blur-[120px]" />
          <div className="absolute bottom-0 left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/30 blur-[100px]" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <img src={logoUrl} alt="Venda Logo" className="w-10 h-10 object-cover rounded-xl shadow-lg ring-1 ring-white/20" />
          <span className="text-2xl font-bold tracking-tight">Venda</span>
        </div>

        <div className="relative z-10 max-w-lg mb-12">
          <h2 className="text-4xl lg:text-5xl font-bold leading-tight mb-6">
            Scale your e-commerce operations seamlessly.
          </h2>
          <p className="text-lg text-zinc-400 font-medium">
            Manage orders, track analytics, recover abandoned carts, and automate your WhatsApp marketing—all from one beautiful dashboard.
          </p>
          
          <div className="flex items-center gap-4 mt-12 pt-12 border-t border-white/10">
            <div className="flex -space-x-3">
              <div className="w-10 h-10 rounded-full border-2 border-zinc-950 bg-zinc-800 flex items-center justify-center text-xs font-bold font-mono">U1</div>
              <div className="w-10 h-10 rounded-full border-2 border-zinc-950 bg-zinc-700 flex items-center justify-center text-xs font-bold font-mono">U2</div>
              <div className="w-10 h-10 rounded-full border-2 border-zinc-950 bg-primary flex items-center justify-center text-xs font-bold font-mono">+12</div>
            </div>
            <p className="text-sm font-medium text-zinc-300">
              Join top vendors managing <span className="text-white font-bold">₦1B+</span> monthly.
            </p>
          </div>
        </div>
      </div>

      {/* ── Right Side (Login Form) ── */}
      <div className="w-full lg:w-[55%] flex flex-col justify-center px-6 py-12 lg:px-24 xl:px-32 bg-white relative">
        <div className="w-full max-w-[420px] mx-auto">
          
          {/* Mobile Logo Fallback */}
          <div className="lg:hidden flex items-center justify-center mb-10 gap-3">
             <img src={logoUrl} alt="Venda Logo" className="w-12 h-12 object-cover rounded-xl shadow-sm border border-gray-100" />
             <span className="text-3xl font-extrabold tracking-tight text-gray-900">Venda</span>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Welcome back</h1>
            <p className="text-gray-500 mt-2 font-medium">Enter your credentials to access your dashboard.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-[13px] font-semibold text-gray-900 mb-1.5 uppercase tracking-wider">
                  Email address
                </label>
                <div className="relative">
                  <input
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
                    placeholder="you@company.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-rose-500 text-xs font-medium mt-1.5">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                   <label className="block text-[13px] font-semibold text-gray-900 uppercase tracking-wider">
                     Password
                   </label>
                   {/* Optional: Add 'Forgot Password' link here if needed later */}
                   {/* <a href="#" className="text-xs font-semibold text-primary hover:text-primary/80">Forgot?</a> */}
                </div>
                
                <div className="relative group">
                  <input
                    {...register('password')}
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-rose-500 text-xs font-medium mt-1.5">{errors.password.message}</p>
                )}
              </div>
            </div>

            {/* Server error */}
            {serverError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-rose-700 text-sm font-medium flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0"></div>
                {serverError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex items-center justify-center gap-2 bg-zinc-950 text-white py-3.5 rounded-xl text-[15px] font-semibold hover:bg-zinc-800 disabled:opacity-70 disabled:hover:bg-zinc-950 transition-all shadow-sm"
            >
              {isSubmitting ? (
                 <>
                   <Loader2 size={18} className="animate-spin" />
                   <span>Authenticating...</span>
                 </>
              ) : (
                <>
                  <span>Sign into Venda</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 font-medium mt-12">
             {new Date().getFullYear()} © Venda CRM. Engineered for scale.
          </p>
        </div>
      </div>
    </div>
  );
}
