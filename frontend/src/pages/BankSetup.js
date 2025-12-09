import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

function BankSetup() {
  const [secretCode, setSecretCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [alreadySetup, setAlreadySetup] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));


  useEffect(() => {
    checkBankStatus();
  }, []);

  const checkBankStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/bank/status', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.isSetup) {
        setAlreadySetup(true);
        setSuccess('Your bank account is already set up!');
      }
    } catch (err) {
      console.error('Error checking bank status:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (alreadySetup) {
      setError('Bank account already set up. You cannot setup twice.');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/bank/setup',
        { secretCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess(response.data.message);
      user.bankAccount.isSetup = true;
      localStorage.setItem('user', JSON.stringify(user));

      setTimeout(() => {
        navigate(user.role === 'instructor' ? '/instructor/home' : '/learner/home');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to setup bank account');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate(user.role === 'instructor' ? '/instructor/home' : '/learner/home');
  };

  if (alreadySetup) {
    return (
      <div className="container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="enrollment-card" style={{ maxWidth: '600px', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>
            <i className='bi bi-check-circle-fill' style={{ color: '#7D9B6E' }}></i>
          </div>
          <h2 style={{ color: 'var(--color-success)', marginBottom: '1rem' }}>Bank Account Already Setup</h2>
          <p style={{ color: 'var(--color-gray-600)', marginBottom: '2rem' }}>
            Your bank account has been configured and is ready to use.
          </p>
          <button
            onClick={() => navigate(user.role === 'instructor' ? '/instructor/home' : '/learner/home')}
            className="btn btn-primary btn-lg"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="enrollment-card" style={{ maxWidth: '600px', width: '100%' }}>
        <div className="text-center mb-3">
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}><i className="bi bi-bank" style={{ color: '#6B7C5E' }}></i></div>
          <h1 style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
            Setup Your Bank Account
          </h1>
          <p style={{ color: 'var(--color-gray-600)', marginBottom: '0.5rem', lineHeight: '1.6' }}>
            Setup your bank account to{' '}
            {user.role === 'learner'
              ? 'enroll in courses and manage your balance'
              : 'create courses and receive payments'}
          </p>
          {user.role === 'learner' && (
            <p style={{
              color: 'var(--color-success)',
              fontWeight: '600',
              marginTop: '1rem',
              padding: '0.75rem',
              background: 'var(--color-secondary-light)',
              borderRadius: 'var(--radius-md)'
            }}>
               <i className='bi bi-gift-fill' style={{ color: '#C9A961' }}></i> You will receive ৳15,000 as initial balance!
            </p>
          )}
        </div>

        {error && (
          <div className="error-message" style={{ marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {success && (
          <div className="success-message" style={{ marginBottom: '1.5rem' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="secretCode">Secret Code</label>
            <input
              type="password"
              id="secretCode"
              name="secretCode"
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value)}
              placeholder="Create a secure 6+ character code"
              required
              minLength={6}
            />
            <small>
              This code will be used to secure your banking transactions. Keep it safe!
            </small>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ flex: 1 }}
              disabled={loading}
            >
              {loading ? 'Setting up...' : 'Setup Bank Account'}
            </button>


          </div>
        </form>

        
      </div>
    </div>
  );
}

export default BankSetup;

