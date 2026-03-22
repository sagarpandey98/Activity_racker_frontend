'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Loader2, ArrowLeft } from 'lucide-react';
import AuthCard from '@/components/auth/AuthCard';
import AuthInput from '@/components/auth/AuthInput';
import { sendOtp, verifyOtp, signup } from '@/lib/api/authApi';
import useAuthStore from '@/lib/store/authStore';

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthStore();
  
  const isOtpLogin = searchParams.get('mode') === 'otp-login';
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    name: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordRequirements = [
    { test: (pwd) => pwd.length >= 8, text: 'At least 8 characters' }
  ];

  const allPasswordRequirementsMet = passwordRequirements.every(req => 
    req.test(formData.password)
  );

  const handleSubmitEmail = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await sendOtp(formData.email);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await verifyOtp(formData.email, formData.otp);

      const token = result.data?.token;
      const isSignedUp = result.data?.isSignedUp;

      if (result.success === true && token) {
        // Token is automatically stored in cookie by proxy
        if (isSignedUp === true) {
          router.push('/dashboard');
        } else {
          setStep(3);
        }
      } else {
        setError(result.message || 'Invalid OTP');
      }
    } catch (err) {
      setError(err?.message || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const response = await signup(formData.email, formData.password, formData.name);
      setUser(response.user || { email: formData.email, name: formData.name });
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

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError('');
    }
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
          
          <h1 className="text-2xl font-bold text-white mb-1">
            {isOtpLogin ? 'Sign in with OTP' : 
              step === 1 ? 'Create your account' : 
              step === 2 ? 'Verify your email' : 
              'Complete your profile'
            }
          </h1>
          <p className="text-sm text-slate-400 text-center">
            {step === 1 
              ? (isOtpLogin ? "We'll send a verification code to your email" : "We'll send a verification code to your email")
              : step === 2
              ? `Enter the 6-digit code sent to ${formData.email}`
              : 'Enter your name and create a password'
            }
          </p>
        </div>

        {/* Step Indicator */}
        {!isOtpLogin && (
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-white' : 'bg-slate-600'}`} />
              <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-white' : 'bg-slate-600'}`} />
              <div className={`w-2 h-2 rounded-full ${step >= 2 ? 'bg-white' : 'bg-slate-600'}`} />
              <div className={`w-8 h-0.5 ${step >= 3 ? 'bg-white' : 'bg-slate-600'}`} />
              <div className={`w-2 h-2 rounded-full ${step >= 3 ? 'bg-white' : 'bg-slate-600'}`} />
            </div>
            <span className="ml-3 text-sm text-slate-600">
              Step {step} of 3
            </span>
          </div>
        )}

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

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <form onSubmit={handleSubmitEmail} className="space-y-5">
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

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-white text-black font-semibold hover:bg-gray-100 transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send verification code'
                  )}
                </button>
              </form>
            </motion.div>
          ) : step === 2 ? (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <form onSubmit={handleSubmitOtp} className="space-y-5">
                {/* Change Email Link */}
                <div className="text-center mb-4">
                  <button
                    type="button"
                    onClick={goBack}
                    className="text-sm text-slate-400 hover:text-white transition-colors flex items-center mx-auto"
                  >
                    <ArrowLeft size={16} className="mr-1" />
                    Change email
                  </button>
                </div>

                <AuthInput
                  label="Verification Code"
                  icon={<Mail size={16} />}
                  type="text"
                  name="otp"
                  value={formData.otp}
                  onChange={handleChange}
                  placeholder="000000"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  disabled={isLoading}
                  className="text-center text-2xl font-bold tracking-[0.5em]"
                />

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-white text-black font-semibold hover:bg-gray-100 transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify code'
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <form onSubmit={handleSubmitSignup} className="space-y-5">
                {/* Back Link */}
                <div className="text-center mb-4">
                  <button
                    type="button"
                    onClick={goBack}
                    className="text-sm text-slate-400 hover:text-white transition-colors flex items-center mx-auto"
                  >
                    <ArrowLeft size={16} className="mr-1" />
                    Back
                  </button>
                </div>

                <AuthInput
                  label="Full Name"
                  icon={<User size={16} />}
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
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

                {/* Password Requirements */}
                <div className="space-y-1">
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center text-xs">
                      <div className={`w-1 h-1 rounded-full mr-2 ${
                        req.test(formData.password) ? 'bg-green-400' : 'bg-slate-600'
                      }`} />
                      <span className={
                        req.test(formData.password) ? 'text-green-400' : 'text-slate-600'
                      }>
                        {req.text}
                      </span>
                    </div>
                  ))}
                </div>

                <AuthInput
                  label="Confirm Password"
                  icon={<Lock size={16} />}
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  error={formData.confirmPassword && formData.password !== formData.confirmPassword ? 'Passwords do not match' : ''}
                  showPasswordToggle
                  showPassword={showConfirmPassword}
                  onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
                />

                <button
                  type="submit"
                  disabled={isLoading || !allPasswordRequirementsMet}
                  className="w-full py-3 rounded-xl bg-white text-black font-semibold hover:bg-gray-100 transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create account'
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Link */}
        <div className="text-center text-sm text-slate-400 mt-6">
          {isOtpLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => router.push(isOtpLogin ? '/signup' : '/login')}
            className="text-white font-medium hover:underline"
          >
            {isOtpLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </AuthCard>
    </motion.div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#000212] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <SignupPageContent />
    </Suspense>
  );
}
