import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Loader2, Mail, Lock, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';

const Signup = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  
  const { signUp, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session && !authLoading) {
      navigate('/predict', { replace: true });
    }
  }, [session, authLoading, navigate]);

  const getPasswordStrength = (pass) => {
    if (pass.length === 0) return { label: '', color: 'bg-transparent' };
    if (pass.length < 6) return { label: 'Weak', color: 'bg-red-500' };
    if (pass.length < 10) return { label: 'Medium', color: 'bg-yellow-500' };
    return { label: 'Strong', color: 'bg-green-500' };
  };

  const strength = getPasswordStrength(password);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoadingLocal(true);
    setError(null);
    setSuccessMsg(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      setLoadingLocal(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoadingLocal(false);
      return;
    }

    try {
      const { data, error: signUpError } = await signUp(email, password, fullName);
      if (signUpError) throw signUpError;
      
      // If user is created but session is null, email confirmation is required.
      if (data?.user && !data?.session) {
        setSuccessMsg('Account created successfully. Please check your email to verify your account.');
      } else {
        navigate('/predict');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingLocal(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-6 relative z-10 my-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-8 md:p-12 rounded-3xl w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Activity className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-2">Create Account</h2>
          <p className="text-slate-400">
            Sign up for a secure patient dashboard
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSignup}>
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0 }}
                className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm"
              >
                {error}
              </motion.div>
            )}
            {successMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0 }}
                className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl text-sm"
              >
                {successMsg}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-400">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Dr. Sarah Smith" 
                className="glass-input pl-12 w-full" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-400">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="email" 
                placeholder="dr.smith@hospital.com" 
                className="glass-input pl-12 w-full" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-slate-400">Password</label>
              {strength.label && (
                <span className={`text-xs px-2 py-0.5 rounded-full text-navy-900 font-bold ${strength.color}`}>
                  {strength.label}
                </span>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="password" 
                placeholder="••••••••" 
                className="glass-input pl-12 w-full" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-400">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="password" 
                placeholder="••••••••" 
                className="glass-input pl-12 w-full" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loadingLocal || !!successMsg}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-navy-900 py-3.5 rounded-xl font-bold transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingLocal && <Loader2 className="animate-spin w-5 h-5" />}
            {loadingLocal ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center mt-8 text-slate-400 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium">
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Signup;
