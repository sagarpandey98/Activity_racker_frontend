'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2 } from 'lucide-react';
import AuthCard from '@/components/auth/AuthCard';
import AuthInput from '@/components/auth/AuthInput';
import { login } from '@/lib/api/authApi';
import useAuthStore from '@/lib/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await login(formData.email, formData.password);
      
      // Store token if provided
      if (response.token) {
        localStorage.setItem('auth_token', response.token);
        
        // Also set as cookie for middleware validation
        const expiryDate = new Date();
        expiryDate.setTime(expiryDate.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days
        document.cookie = `auth_token=${response.token}; path=/; expires=${expiryDate.toUTCString()}`;
      }
      
      setUser(response.user || { email: formData.email });
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <AuthCard>
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-black font-extrabold">N</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tighter">Northstar</span>
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-sm text-slate-400 text-center">
            Sign in to continue tracking your goals
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
          >
            <p className="text-sm text-red-400">{error}</p>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <AuthInput
            label="Email"
            icon={<Mail size={16} />}
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            required
            disabled={isLoading}
          />

          <AuthInput
            label="Password"
            icon={<Lock size={16} />}
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            required
            disabled={isLoading}
            showPasswordToggle
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword(!showPassword)}
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-white text-black font-semibold hover:bg-gray-100 transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-white/[0.08]"></div>
          <span className="text-xs text-slate-600">or</span>
          <div className="flex-1 h-px bg-white/[0.08]"></div>
        </div>

        {/* OTP Button */}
        <button
          onClick={() => router.push('/signup?mode=otp-login')}
          className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-all"
        >
          Continue with OTP
        </button>

        {/* Bottom Link */}
        <div className="text-center text-sm text-slate-400 mt-6">
          Don't have an account?{' '}
          <button
            onClick={() => router.push('/signup')}
            className="text-white font-medium hover:underline"
          >
            Sign up
          </button>
        </div>
      </AuthCard>
    </motion.div>
  );
}
