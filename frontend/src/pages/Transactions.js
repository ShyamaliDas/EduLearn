import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

function Transactions() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = JSON.parse(localStorage.getItem('user'));

    if (!token || !userData) {
      navigate('/login');
      return;
    }

    setUser(userData);
    fetchTransactions();
    fetchBalance();
  }, [navigate]);

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/bank/transactions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setLoading(false);
    }
  };

  const fetchBalance = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/bank/balance', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBalance(response.data.balance);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const getTransactionType = (transaction) => {
    const userAccount = user?.bankAccount?.accountNumber;

    if (transaction.fromAccount === 'SYSTEM') {
      return 'credit';
    } else if (transaction.fromAccount === userAccount) {
      return 'debit';
    } else if (transaction.toAccount === userAccount) {
      return 'credit';
    }
    return 'unknown';
  };

  const getTransactionAmount = (transaction) => {
    const type = getTransactionType(transaction);
    const amount = parseFloat(transaction.amount);
    return type === 'credit' ? `+৳${amount}` : `-৳${amount}`;
  };

  if (loading) {
    return <div className="loading">Loading transactions...</div>;
  }

  return (
    <div className="container" style={{ maxWidth: '1000px', paddingTop: '2rem', paddingBottom: '3rem' }}>
      {/* Header with Balance */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
        padding: '2.5rem',
        borderRadius: 'var(--radius-xl)',
        marginBottom: '2rem',
        color: 'white',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ color: 'white', marginBottom: '0.5rem' }}>Transaction History</h1>
            <p style={{ color: 'var(--color-secondary-light)', margin: 0 }}>
              All your bank transactions:
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.9rem', opacity: '0.9', marginBottom: '0.25rem' }}>
              Current Balance
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: '700' }}>
              ৳{balance.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><i className="bi bi-credit-card-fill" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i></div>
          <h2>No Transactions Yet</h2>
          <p>Your transaction history will appear here</p>
        </div>
      ) : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          {/* Table Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '140px 1fr 1fr 140px 140px',
            gap: '1rem',
            padding: '1.25rem 1.5rem',
            background: 'var(--color-gray-50)',
            borderBottom: '2px solid var(--color-gray-200)',
            fontWeight: '600',
            fontSize: '0.9rem',
            color: 'var(--color-gray-700)'
          }}>
            <div>Date</div>
            <div>From</div>
            <div>To</div>
            <div>Type</div>
            <div style={{ textAlign: 'right' }}>Amount</div>
          </div>

          {/* Transaction Rows */}
          {transactions.map((transaction, index) => {
            const type = getTransactionType(transaction);
            const isCredit = type === 'credit';

            return (
              <div
                key={transaction.id || index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr 1fr 140px 140px',
                  gap: '1rem',
                  padding: '1.25rem 1.5rem',
                  borderBottom: index < transactions.length - 1 ? '1px solid var(--color-gray-200)' : 'none',
                  transition: 'background var(--transition-fast)',
                  background: 'white'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-gray-50)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)' }}>
                  {new Date(transaction.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>

                <div style={{ fontSize: '0.9rem' }}>
                  <div style={{ fontWeight: '500', color: 'var(--color-gray-900)' }}>
                    {transaction.fromAccount === 'SYSTEM' ? (
                      <span><i className="bi bi-bank" style={{ color: '#6B7C5E' }}></i> System</span>
                    ) : (
                      transaction.fromAccount
                    )}
                  </div>
                </div>


                <div style={{ fontSize: '0.9rem' }}>
                  <div style={{ fontWeight: '500', color: 'var(--color-gray-900)' }}>
                    {transaction.toAccount}
                  </div>
                </div>

                <div>
                  <span style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    background: isCredit ? '#f0f9f4' : '#fef2f2',
                    color: isCredit ? 'var(--color-success)' : 'var(--color-danger)'
                  }}>
                    {isCredit ? '↓ Credit' : '↑ Debit'}
                  </span>
                </div>

                <div style={{
                  textAlign: 'right',
                  fontWeight: '700',
                  fontSize: '1.05rem',
                  color: isCredit ? 'var(--color-success)' : 'var(--color-danger)'
                }}>
                  {getTransactionAmount(transaction)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Transactions;

