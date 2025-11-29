const express = require('express');
const router = express.Router();
const BankAccount = require('../models/BankAccount');
const Transaction = require('../models/Transaction');

// Create account with secret code
router.post('/create-account', async (req, res) => {
  try {
    const { accountNumber, ownerName, initialBalance, secretCode } = req.body;

    const existingAccount = await BankAccount.findOne({ 
      where: { accountNumber } 
    });

    if (existingAccount) {
      return res.status(400).json({ message: 'Account already exists' });
    }

    const account = await BankAccount.create({
      accountNumber,
      ownerName,
      balance: initialBalance || 0,
      secretCode: secretCode || null
    });

    res.status(201).json({
      success: true,
      account: {
        accountNumber: account.accountNumber,
        ownerName: account.ownerName,
        balance: account.balance
      }
    });
  } catch (error) {
    console.error('Create account error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify secret code
router.post('/verify-secret', async (req, res) => {
  try {
    const { accountNumber, secretCode } = req.body;

    const account = await BankAccount.findOne({ 
      where: { accountNumber } 
    });

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    if (account.secretCode !== secretCode) {
      return res.status(400).json({ message: 'Invalid secret code' });
    }

    res.json({ success: true, message: 'Secret code verified' });
  } catch (error) {
    console.error('Verify secret error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add funds (for rewards)
router.post('/add-funds', async (req, res) => {
  try {
    const { accountNumber, amount, description } = req.body;

    const account = await BankAccount.findOne({ 
      where: { accountNumber } 
    });

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Add funds
    account.balance = parseFloat(account.balance) + parseFloat(amount);
    await account.save();

    // Create transaction record
    await Transaction.create({
      fromAccount: 'SYSTEM',
      toAccount: accountNumber,
      amount,
      description: description || 'Funds added',
      status: 'completed'
    });

    res.json({
      success: true,
      message: 'Funds added successfully',
      newBalance: account.balance
    });
  } catch (error) {
    console.error('Add funds error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get balance
router.get('/balance/:accountNumber', async (req, res) => {
  try {
    const account = await BankAccount.findOne({
      where: { accountNumber: req.params.accountNumber }
    });

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.json({
      accountNumber: account.accountNumber,
      balance: parseFloat(account.balance)
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Transfer funds
router.post('/transfer', async (req, res) => {
  try {
    const { fromAccount, toAccount, amount, description } = req.body;

    const fromAcc = await BankAccount.findOne({ 
      where: { accountNumber: fromAccount } 
    });
    const toAcc = await BankAccount.findOne({ 
      where: { accountNumber: toAccount } 
    });

    if (!fromAcc || !toAcc) {
      return res.status(404).json({ message: 'Account not found' });
    }

    if (parseFloat(fromAcc.balance) < parseFloat(amount)) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Perform transfer
    fromAcc.balance = parseFloat(fromAcc.balance) - parseFloat(amount);
    toAcc.balance = parseFloat(toAcc.balance) + parseFloat(amount);

    await fromAcc.save();
    await toAcc.save();

    // Create transaction
    const transaction = await Transaction.create({
      fromAccount,
      toAccount,
      amount,
      description,
      status: 'completed'
    });

    res.json({
      success: true,
      message: 'Transfer successful',
      transaction
    });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get transactions
router.get('/transactions/:accountNumber', async (req, res) => {
  try {
    const { accountNumber } = req.params;

    const transactions = await Transaction.findAll({
      where: {
        [require('sequelize').Op.or]: [
          { fromAccount: accountNumber },
          { toAccount: accountNumber }
        ]
      },
      order: [['createdAt', 'DESC']]
    });

    res.json(transactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;