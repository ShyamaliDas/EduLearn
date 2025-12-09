import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BANK_SERVICE_URL = 'http://localhost:5002';

function BankTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'bank') {
      navigate('/login');
      return;
    }

    fetchTransactions();
  }, [navigate]);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${BANK_SERVICE_URL}/api/bank/transactions`);
      setTransactions(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setLoading(false);
    }
  };

  
  const filteredTransactions = transactions.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'validated') {
      // Validated = approved OR rejected (anything processed)
      return t.status === 'approved' || t.status === 'rejected';
    }
    return t.status === filter;
  });

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'status-pending',
      approved: 'status-approved',
      rejected: 'status-rejected',
      failed: 'status-failed'
    };
    const className = badges[status] || 'status-default';

    const displayNames = {
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      failed: 'Failed'
    };
    const text = displayNames[status] || status.charAt(0).toUpperCase() + status.slice(1);

    return <span className={`status-badge ${className}`}>{text}</span>;
  };

  const getTypeLabel = (type) => {
    const labels = {
      course_creation_reward: 'Course Creation Reward',
      course_enrollment: 'Course Enrollment',
      instructor_payment: 'Instructor Payment',
      bank_commission: 'Bank Commission'
    };
    return labels[type] || type;
  };



  if (loading) {
    return <div className="bank-transactions-loading">Loading...</div>;
  }

  return (
    <div className="bank-transactions-page">
      <header className="bank-transactions-header">
        <h1><i className="bi bi-bank" style={{ color: '#6B7C5E' }}></i> All Bank Transactions</h1>
        <p>Complete transaction history</p>
      </header>

      <div className="back-button-container">
        <button
          onClick={() => navigate('/bank/dashboard')}
          className="back-button"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* UPDATED: 5 filter buttons now */}
      <div className="transaction-filters">
        {['all', 'pending', 'approved', 'rejected', 'validated'].map((filterType) => {
          let count;
          if (filterType === 'all') {
            count = transactions.length;
          } else if (filterType === 'validated') {
            count = transactions.filter(t =>
              t.status === 'approved' || t.status === 'rejected'
            ).length;
          } else {
            count = transactions.filter(t => t.status === filterType).length;
          }

          return (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`filter-btn ${filter === filterType ? 'active' : ''}`}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="no-transactions">
          <p><i className="bi bi-x-circle-fill" style={{ color: '#B85C5C' }}></i> No {filter !== 'all' ? filter : ''} transactions found</p>
        </div>
      ) : (
        <div className="transactions-table-container">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>From Account</th>
                <th>To Account</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction, index) => (
                <tr key={transaction.id} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                  <td className="date-cell">
                    {new Date(transaction.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td className="type-cell">{getTypeLabel(transaction.transactionType)}</td>
                  <td>{transaction.description}</td>
                  <td className="account-cell">{transaction.fromAccount}</td>
                  <td className="account-cell">{transaction.toAccount}</td>
                  <td className={`amount-cell ${transaction.amount < 0 ? 'negative' : 'positive'}`}>
                    {parseFloat(transaction.amount).toFixed(2)} TK
                  </td>
                  <td>{getStatusBadge(transaction.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default BankTransactions;