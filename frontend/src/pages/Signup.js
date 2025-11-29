import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

function Signup() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'learner'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/auth/register', {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/bank-setup');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div className="auth-card" style={{ maxWidth: '520px', width: '100%' }}>
        <div className="text-center mb-3">
          <h1 style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
            Create Account
          </h1>
          <p style={{ color: 'var(--color-gray-600)', marginBottom: '2rem' }}>
            Join EduLearn and start your learning journey
          </p>
        </div>

        {error && (
          <div className="error-message" style={{ marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Choose a username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your.email@example.com"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Min. 6 characters"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="role">I want to</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option value="learner">Learn from courses</option>
            </select>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-lg" 
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ 
          marginTop: '2rem', 
          paddingTop: '1.5rem', 
          borderTop: '1px solid var(--color-gray-200)',
          textAlign: 'center'
        }}>
          <p style={{ color: 'var(--color-gray-600)' }}>
            Already have an account?{' '}
            <Link 
              to="/login" 
              style={{ 
                color: 'var(--color-primary)', 
                fontWeight: '600',
                textDecoration: 'none'
              }}
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;


