import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect
  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await login(email, password);
      if (res.success) {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading-page"><div className="spinner"></div>Loading...</div>;
  }

  return (
    <div className="login-bg">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo">✨</div>
        <p className="login-title">AI Incident Manager</p>
        <p className="login-sub">AI-powered social issue detection and rapid triage dashboard.</p>

        {error && <div className="login-error">{error}</div>}

        <label className="login-label">Email</label>
        <input
          className="login-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@example.com"
          required
          autoFocus
        />

        <label className="login-label">Password</label>
        <input
          className="login-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />

        <button className="login-btn" type="submit" disabled={submitting}>
          {submitting ? <><span className="spinner"></span> Signing in...</> : 'Sign in to Control Center'}
        </button>
      </form>
    </div>
  );
};

export default Login;
