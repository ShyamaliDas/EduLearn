import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

function BankDashboard() {
  const navigate = useNavigate();
  const [bankBalance, setBankBalance] = useState(0);
  const [users, setUsers] = useState([]);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'bank') {
      navigate('/login');
      return;
    }

    fetchBankData();
    const interval = setInterval(fetchBankData, 5000);
    return () => clearInterval(interval);
  }, [navigate]);

  const fetchBankData = async () => {
    try {
      // Fetch LMS Organization balance
      const balanceRes = await axios.get('http://localhost:5002/api/bank/lms-balance');
      const orgBalance = balanceRes.data.balance;
      setBankBalance(orgBalance);

      // Fetch all users with bank accounts from MAIN backend
      const usersRes = await axios.get('http://localhost:5000/api/auth/all-users', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Fetch each user's actual balance from bank service
      const usersWithBalances = await Promise.all(
        (usersRes.data.users || []).map(async (user) => {
          // If bank role, show org balance (bank IS the organization)
          if (user.role === 'bank') {
            return {
              ...user,
              bankAccount: {
                accountNumber: user.bankAccount?.accountNumber || 'N/A',
                balance: orgBalance  
              }
            };
          }

          // For other users, fetch their balance
          if (user.bankAccount?.accountNumber) {
            try {
              const balanceRes = await axios.get(
                `http://localhost:5002/api/bank/balance/${user.bankAccount.accountNumber}`
              );
              return {
                ...user,
                bankAccount: {
                  ...user.bankAccount,
                  balance: balanceRes.data.balance
                }
              };
            } catch (err) {
              console.error(`Error fetching balance for ${user.username}:`, err);
              return user;
            }
          }
          return user;
        })
      );

      setUsers(usersWithBalances);

      // Fetch pending transactions
      const pendingRes = await axios.get('http://localhost:5002/api/bank/transactions/pending');
      setPendingTransactions(pendingRes.data || []);

      setLoading(false);
      setError(null);
    } catch (error) {
      console.error('Error fetching bank data:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  const handleValidate = async (transaction) => {
    setProcessing(transaction.id);
    try {
      let endpoint = '';
      
      if (transaction.transactionType === 'course_creation_reward') {
        endpoint = 'http://localhost:5002/api/bank/validate-course-creation';
      } else if (transaction.transactionType === 'course_enrollment') {
        endpoint = 'http://localhost:5002/api/bank/validate-enrollment';
      }

      await axios.post(endpoint, { transactionId: transaction.id });
      alert('Transaction validated successfully!');
      fetchBankData();
    } catch (error) {
      console.error('Validation error:', error);
      alert(error.response?.data?.message || 'Failed to validate transaction');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (transaction) => {
    const transactionType = transaction.transactionType === 'course_creation_reward' 
      ? 'course creation' 
      : 'enrollment';
    
    if (!window.confirm(`Are you sure you want to REJECT this ${transactionType}?\n\nThis action cannot be undone.`)) {
      return;
    }

    setProcessing(transaction.id);
    try {
      // Use the updated reject endpoint
      await axios.post('http://localhost:5002/api/bank/reject-transaction', {
        transactionId: transaction.id
      });
      
      alert('Transaction rejected successfully');
      fetchBankData();
    } catch (error) {
      console.error('Reject error:', error);
      alert(error.response?.data?.message || 'Failed to reject transaction');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return <div className="loading">Loading E-Commerce Organization...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error Loading Dashboard</h2>
        <p>{error}</p>
        <p>Make sure bank-service is running on port 5002</p>
      </div>
    );
  }

  return (
    <div className="bank-dashboard-container">
      <header className="bank-dashboard-header">
        <h1>Bank Dashboard</h1>
        <p>Manage bank operations and validate transactions</p>
      </header>

      <div className="bank-stats-grid">
        <div className="stats-card">
          <div className="stats-icon stats-icon-primary">
            <i className="bi bi-bank"></i>
          </div>
          <div className="stats-content">
            <h3>Bank Balance</h3>
            <p className="stats-number">{bankBalance.toLocaleString()} TK</p>
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-icon stats-icon-blue">
            <i className="bi bi-people-fill"></i>
          </div>
          <div className="stats-content">
            <h3>Total Users</h3>
            <p className="stats-number">{users.length}</p>
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-icon stats-icon-warning">
            <i className="bi bi-hourglass-split"></i>
          </div>
          <div className="stats-content">
            <h3>Pending Transactions</h3>
            <p className="stats-number">{pendingTransactions.length}</p>
          </div>
        </div>
      </div>

      {/* View All Transactions Button */}
      <div style={{ textAlign: 'center', margin: '30px 0' }}>
        <button 
          onClick={() => navigate('/bank/transactions')} 
          className="btn btn-primary"
          style={{ fontSize: '1.1rem', padding: '12px 32px' }}
        >
           <i className="bi bi-credit-card-fill" style={{ color: '#d2a050ff', fontSize: '3rem' }}></i>

          View All Transactions
        </button>
      </div>

      <div className="bank-main-grid">
        <section className="bank-section">
          <h2 className="bank-section-title">
            <i className="bi bi-exclamation-triangle bank-icon-warning"></i> Pending Transactions
          </h2>
          {pendingTransactions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon-success">
                <i className="bi bi-check-circle"></i>
              </div>
              <p>No pending transactions</p>
            </div>
          ) : (
            <div className="transactions-list">
              {pendingTransactions.map((transaction) => (
                <div key={transaction.id} className="transaction-card">
                  <div className="transaction-header">
                    <h3 className="transaction-type">
                      {transaction.transactionType === 'course_creation_reward'
                        ? 'COURSE CREATION REWARD'
                        : 'COURSE ENROLLMENT PAYMENT'}
                    </h3>
                  </div>
                  <div className="transaction-details">
                    <div className="transaction-detail-row">
                      <strong>From:</strong> {transaction.fromAccount}
                    </div>
                    <div className="transaction-detail-row">
                      <strong>To:</strong> {transaction.toAccount}
                    </div>
                    <p className="transaction-amount">
                      Amount: {parseFloat(transaction.amount).toFixed(2)} TK
                    </p>
                    <p className="transaction-description">{transaction.description}</p>
                  </div>
                  <div className="transaction-actions">
                    <button
                      onClick={() => handleValidate(transaction)}
                      disabled={processing === transaction.id}
                      className="btn btn-success"
                    >
                      <i className="bi bi-check-circle"></i>
                      {processing === transaction.id ? ' Processing...' : ' Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(transaction)}
                      disabled={processing === transaction.id}
                      className="btn btn-danger"
                    >
                      <i className="bi bi-x-circle"></i> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bank-section">
          <h2 className="bank-section-title">
            <i className="bi bi-people bank-icon-blue"></i> Registered Users
          </h2>
          {users.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <i className="bi bi-person-x"></i>
              </div>
              <p><i className="bi bi-x-circle-fill" style={{ color: '#B85C5C' }}></i>No users registered yet</p>
            </div>
          ) : (
            <div className="users-list">
              {users.map((user) => (
                <div key={user.id} className="user-card">
                  <div className="user-card-content">
                    <div className="user-avatar">
                      <i className={
                        user.role === 'learner' 
                          ? 'bi bi-mortarboard-fill' 
                          : user.role === 'instructor' 
                          ? 'bi bi-person-video3' 
                          : 'bi bi-bank'
                      }></i>
                    </div>
                    <div className="user-info">
                      <h4 className="user-account-number">{user.username}</h4>
                      <p className="user-role">
                        <strong>Account:</strong>{' '}
                        {user.role === 'bank' 
                          ? 'Bank Organization' 
                          : user.bankAccount?.accountNumber || 'Not setup'}
                      </p>
                      <p className="user-role">
                        <strong>Role:</strong>{' '}
                        <span className={`badge badge-${user.role}`}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </p>
                    </div>
                    <div className="user-balance-section">
                      <p className="user-balance">
                        {user.bankAccount?.balance !== undefined
                          ? `${parseFloat(user.bankAccount.balance).toLocaleString()} TK`
                          : '0 TK'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default BankDashboard;