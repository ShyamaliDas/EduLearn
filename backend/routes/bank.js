const express = require('express');
const router = express.Router();
const axios = require('axios');
const { User } = require('../models');
const { auth } = require('../middleware/auth');

// Setup bank account
router.post('/setup', auth, async (req, res) => {
  try {
    const { secretCode } = req.body;

    if (!secretCode) {
      return res.status(400).json({ message: 'Secret code is required' });
    }

    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.bankAccount?.isSetup) {
      return res.status(400).json({ message: 'Bank account already set up' });
    }

    // Generate account number
    const accountNumber = 'ACC' + Date.now() + Math.floor(Math.random() * 1000);

    // Create account in bank service
    try {
      const bankResponse = await axios.post(
        `${process.env.BANK_SERVICE_URL}/api/bank/create-account`,
        {
          accountNumber,
          ownerName: user.username,
          initialBalance: 0,
          secretCode,
          role: user.role  
        }
      );

      console.log('Bank account created successfully:', bankResponse.data);

      user.bankAccount = {
        accountNumber,
        secretCode,
        isSetup: true
      };

      await user.save();

      // Get actual balance from bank
      const balanceResponse = await axios.get(
        `${process.env.BANK_SERVICE_URL}/api/bank/balance/${accountNumber}`
      );

      res.json({
        message: user.role === 'learner' 
          ? 'Bank account set up successfully! You received 10,000 TK.'
          : 'Bank account set up successfully!',
        account: {
          accountNumber,
          balance: balanceResponse.data.balance
        }
      });
    } catch (bankError) {
      console.error('Bank service error:', bankError.response?.data || bankError.message);
      return res.status(500).json({
        message: bankError.response?.data?.message || 'Failed to setup bank account'
      });
    }
  } catch (error) {
    console.error('Bank setup error:', error);
    res.status(500).json({
      message: 'Server error during bank setup'
    });
  }
});

// Get balance
router.get('/balance', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user.bankAccount?.isSetup) {
      return res.status(400).json({ message: 'Bank account not set up' });
    }

    const balanceResponse = await axios.get(
      `${process.env.BANK_SERVICE_URL}/api/bank/balance/${user.bankAccount.accountNumber}`
    );

    res.json(balanceResponse.data);
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ message: 'Failed to get balance' });
  }
});

// Get transaction history
router.get('/transactions', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user.bankAccount?.isSetup) {
      return res.status(400).json({ message: 'Bank account not set up' });
    }

    const transactionsResponse = await axios.get(
      `${process.env.BANK_SERVICE_URL}/api/bank/transactions/${user.bankAccount.accountNumber}`
    );

    res.json(transactionsResponse.data);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Failed to get transactions' });
  }
});

// Check bank status
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user.bankAccount?.isSetup) {
      return res.json({
        isSetup: false,
        accountNumber: null,
        balance: null
      });
    }

    // Get current balance from bank service
    try {
      const balanceResponse = await axios.get(
        `${process.env.BANK_SERVICE_URL}/api/bank/balance/${user.bankAccount.accountNumber}`
      );

      res.json({
        isSetup: true,
        accountNumber: user.bankAccount.accountNumber,
        balance: balanceResponse.data.balance
      });
    } catch (error) {
      res.json({
        isSetup: true,
        accountNumber: user.bankAccount.accountNumber,
        balance: 0
      });
    }
  } catch (error) {
    console.error('Get bank status error:', error);
    res.status(500).json({ message: 'Failed to get bank status' });
  }
});

module.exports = router;
