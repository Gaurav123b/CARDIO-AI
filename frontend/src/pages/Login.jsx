import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Loader2, Mail, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [error, setError] = useState(null);
  
  const { signIn, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (session && !authLoading) {
      navigate('/predict', { replace: true });
    }
  }, [session, authLoading, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoadingLocal(true);
    setError(null);

    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        const message = String(signInError.message || '').toLowerCase();

        if (
          message.includes('invalid-credential') ||
          message.includes('user-not-found') ||
          message.includes('wrong-password')
        ) {
          throw new Error('Email or password is incorrect.');
        }

        throw signInError;
      }
      navigate('/predict');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingLocal(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-6 relative z-10">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-8 md:p-12 rounded-3xl w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Activity className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-2">Welcome Back</h2>
          <p className="text-slate-400">
            Sign in to access your AI patient dashboard
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleLogin}>
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
          </AnimatePresence>

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
              <Link to="/forgot-password" className="text-xs text-cyan-400 hover:text-cyan-300">
                Forgot Password?
              </Link>
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

          <button 
            type="submit" 
            disabled={loadingLocal}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-navy-900 py-3.5 rounded-xl font-bold transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] mt-4 flex items-center justify-center gap-2"
          >
            {loadingLocal && <Loader2 className="animate-spin w-5 h-5" />}
            {loadingLocal ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center mt-8 text-slate-400 text-sm">
          Don't have an account?{' '}
          <Link to="/signup" className="text-cyan-400 hover:text-cyan-300 font-medium">
            Create account
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
