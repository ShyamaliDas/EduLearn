const express = require('express');
const router = express.Router();
const BankAccount = require('../models/BankAccount');
const Transaction = require('../models/Transaction');
const { Op } = require('sequelize');

const LMS_ORG_ACCOUNT = 'LMS_ORG_ACCOUNT';

// Initialize LMS Organization account
const initializeLMSAccount = async () => {
  try {
    const lmsAccount = await BankAccount.findOne({
      where: { accountNumber: LMS_ORG_ACCOUNT }
    });

    if (!lmsAccount) {
      await BankAccount.create({
        accountNumber: LMS_ORG_ACCOUNT,
        ownerName: 'EduLearn E-Commerce Organization',
        balance: 200000,
        secretCode: 'bank123'
      });
      console.log('EduLearn Organization account created with 200,000 TK');
    } else {
      console.log(`LMS Balance: ${lmsAccount.balance} TK`);
    }
  } catch (error) {
    console.error('Error initializing organization account:', error);
  }
};

initializeLMSAccount();

// Create account with secret code
router.post('/create-account', async (req, res) => {
  try {
    const { accountNumber, ownerName, initialBalance, secretCode, role } = req.body;

    const existingAccount = await BankAccount.findOne({
      where: { accountNumber }
    });

    if (existingAccount) {
      return res.status(400).json({ message: 'Account already exists' });
    }

    let finalBalance = initialBalance || 0;

    // Give 15,000 TK to new learners
    if (role === 'learner') {
      const lmsAccount = await BankAccount.findOne({
        where: { accountNumber: LMS_ORG_ACCOUNT }
      });

      if (lmsAccount && parseFloat(lmsAccount.balance) >= 15000) {
        lmsAccount.balance = parseFloat(lmsAccount.balance) - 15000;
        await lmsAccount.save();

        finalBalance = 15000;

        await Transaction.create({
          fromAccount: LMS_ORG_ACCOUNT,
          toAccount: accountNumber,
          amount: 15000,
          description: 'Initial balance for new learner',
          status: 'completed',
          transactionType: 'bank_commission'
        });

        console.log(`Learner ${ownerName} received 15,000 TK from LMS`);
      }
    }

    const account = await BankAccount.create({
      accountNumber,
      ownerName,
      balance: finalBalance,
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

// Course Creation - Pending Transaction 
router.post('/course-creation-pending', async (req, res) => {
  try {
    const { instructorAccount, courseId, courseTitle } = req.body;

    const lmsAccount = await BankAccount.findOne({
      where: { accountNumber: LMS_ORG_ACCOUNT }
    });

    if (!lmsAccount || parseFloat(lmsAccount.balance) < 1500) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient LMS funds for course creation reward'
      });
    }

    // Create pending transaction - instructor does NOT receive money yet
    const transaction = await Transaction.create({
      fromAccount: LMS_ORG_ACCOUNT,
      toAccount: instructorAccount,
      amount: 1500,
      description: `Course creation reward: ${courseTitle}`,
      status: 'pending',
      transactionType: 'course_creation_reward',
      relatedId: courseId.toString()
    });

    console.log(`Course creation pending - Transaction ID: ${transaction.id}`);

    res.json({
      success: true,
      message: 'Course creation pending bank validation',
      transactionId: transaction.id
    });
  } catch (error) {
    console.error('Course creation pending error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Validate Course Creation Transaction (bank approves and instructor receives money)
router.post('/validate-course-creation', async (req, res) => {
  try {
    const { transactionId } = req.body;

    const transaction = await Transaction.findByPk(transactionId);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ message: 'Transaction already processed' });
    }

    const lmsAccount = await BankAccount.findOne({
      where: { accountNumber: transaction.fromAccount }
    });

    const instructorAccount = await BankAccount.findOne({
      where: { accountNumber: transaction.toAccount }
    });

    if (!lmsAccount || !instructorAccount) {
      transaction.status = 'failed';
      await transaction.save();
      return res.status(404).json({ message: 'Account not found' });
    }

    if (parseFloat(lmsAccount.balance) < parseFloat(transaction.amount)) {
      transaction.status = 'failed';
      await transaction.save();
      return res.status(400).json({ message: 'Insufficient LMS balance' });
    }

    // Transfer 1,500 TK from bank to instructor
    lmsAccount.balance = (parseFloat(lmsAccount.balance) - parseFloat(transaction.amount)).toFixed(2);
    instructorAccount.balance = (parseFloat(instructorAccount.balance) + parseFloat(transaction.amount)).toFixed(2);

    await lmsAccount.save();
    await instructorAccount.save();

    transaction.status = 'approved';
    await transaction.save();

    console.log(`Course creation validated - Instructor received 1,500 TK`);

    // CRITICAL: Notify LMS backend to activate the course
    try {
      const axios = require('axios');
      const courseId = transaction.relatedId;
      
      console.log(`Attempting to activate course ${courseId}...`);
      console.log(`Sending PUT request to: http://localhost:5000/api/courses/${courseId}/validate`);
      
      const activateResponse = await axios.put(
        `http://localhost:5000/api/courses/${courseId}/validate`,
        { bankValidated: true },
        { 
          timeout: 5000,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      console.log(`LMS Response:`, activateResponse.data);
      console.log(`Course ${courseId} successfully activated!`);
      
    } catch (notifyError) {
      console.error('FAILED to activate course in LMS!');
      console.error('Error:', notifyError.message);
      console.error('Response:', notifyError.response?.data);
      console.error('Status:', notifyError.response?.status);
      
    }

    res.json({
      success: true,
      message: 'Course creation validated and instructor rewarded',
      transaction
    });
  } catch (error) {
    console.error('Validate course creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Enrollment - Pending Transaction
router.post('/enrollment-pending', async (req, res) => {
  try {
    const { learnerAccount, instructorAccount, amount, courseTitle, courseId, enrollmentId } = req.body;

    const learnerAcc = await BankAccount.findOne({
      where: { accountNumber: learnerAccount }
    });

    const instructorAcc = await BankAccount.findOne({
      where: { accountNumber: instructorAccount }
    });

    if (!learnerAcc || !instructorAcc) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Check if learner has sufficient balance
    if (parseFloat(learnerAcc.balance) < parseFloat(amount)) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const transaction = await Transaction.create({
      fromAccount: learnerAccount,
      toAccount: instructorAccount,
      amount: amount,
      description: `Enrollment fee for: ${courseTitle}`,
      status: 'pending',
      transactionType: 'course_enrollment',
      relatedId: enrollmentId.toString()
    });

    console.log(`Enrollment pending - Transaction ID: ${transaction.id}`);

    res.json({
      success: true,
      message: 'Enrollment pending bank validation',
      transactionId: transaction.id
    });
  } catch (error) {
    console.error('Enrollment pending error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Validate Enrollment Transaction (80% instructor, 20% bank)
router.post('/validate-enrollment', async (req, res) => {
  try {
    const { transactionId } = req.body;
    const transaction = await Transaction.findByPk(transactionId);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ message: 'Transaction already processed' });
    }

    // Get accounts
    const learnerAcc = await BankAccount.findOne({ where: { accountNumber: transaction.fromAccount } });
    const instructorAcc = await BankAccount.findOne({ where: { accountNumber: transaction.toAccount } });
    const lmsAccount = await BankAccount.findOne({ where: { accountNumber: LMS_ORG_ACCOUNT } });

    if (!learnerAcc || !instructorAcc || !lmsAccount) {
      transaction.status = 'failed';
      await transaction.save();
      return res.status(404).json({ message: 'Account not found' });
    }

    const totalAmount = parseFloat(transaction.amount);

    // Check learner balance
    if (parseFloat(learnerAcc.balance) < totalAmount) {
      transaction.status = 'failed';
      await transaction.save();
      return res.status(400).json({ message: 'Insufficient learner balance' });
    }

    // Calculate split (80% instructor, 20% bank)
    const instructorShare = (totalAmount * 0.80).toFixed(2);
    const bankShare = (totalAmount * 0.20).toFixed(2);

    // Deduct from learner, split between instructor and bank
    learnerAcc.balance = (parseFloat(learnerAcc.balance) - totalAmount).toFixed(2);
    instructorAcc.balance = (parseFloat(instructorAcc.balance) + parseFloat(instructorShare)).toFixed(2);
    lmsAccount.balance = (parseFloat(lmsAccount.balance) + parseFloat(bankShare)).toFixed(2);

    await learnerAcc.save();
    await instructorAcc.save();
    await lmsAccount.save();

    await transaction.destroy();

    // Transaction 1: Learner -> Instructor (80%)
    const instructorTransaction = await Transaction.create({
      fromAccount: learnerAcc.accountNumber,
      toAccount: instructorAcc.accountNumber,
      amount: instructorShare,
      description: `Enrollment fee for: ${transaction.description.split('Enrollment fee for: ')[1]} - Instructor (80%)`,
      status: 'approved',
      transactionType: 'course_enrollment',
      relatedId: transaction.relatedId
    });

    // Transaction 2: Learner -> LMS Org (20%)
    const bankTransaction = await Transaction.create({
      fromAccount: learnerAcc.accountNumber,
      toAccount: LMS_ORG_ACCOUNT,
      amount: bankShare,
      description: `Enrollment fee for: ${transaction.description.split('Enrollment fee for: ')[1]} - Bank Commission (20%)`,
      status: 'approved',
      transactionType: 'bank_commission',
      relatedId: transaction.relatedId
    });


    // **NOTIFY LMS BACKEND** - Update enrollment status
    try {
      const axios = require('axios');
      await axios.post(`http://localhost:5000/api/enrollments/${transaction.relatedId}/validate`, {
        transactionId: transaction.id,
        validated: true
      });
      console.log(`Notified LMS about enrollment ${transaction.relatedId} validation`);
    } catch (notifyError) {
      console.error('Error notifying LMS:', notifyError.message);
      console.error('Full error:', notifyError.response?.data);
    }

    console.log(`Enrollment validated - Instructor: ${instructorShare} TK (80%), Bank: ${bankShare} TK (20%)`);

    res.json({
      success: true,
      message: 'Enrollment validated successfully',
      instructorShare,
      bankShare,
      transactions: {
        instructor: instructorTransaction,
        bank: bankTransaction
      }
    });
  } catch (error) {
    console.error('Validate enrollment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Get pending transactions
router.get('/transactions/pending', async (req, res) => {
  try {
    const pendingTransactions = await Transaction.findAll({
      where: { status: 'pending' },
      order: [['createdAt', 'DESC']]
    });

    res.json(pendingTransactions);
  } catch (error) {
    console.error('Get pending transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Validate transaction (approve from bank dashboard)
router.post('/validate-transaction/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Mark transaction as validated
    transaction.status = 'validated';
    await transaction.save();

    // If it's a course creation, update the course in LMS
    if (transaction.transactionType === 'course_creation_reward') {
      try {
        const axios = require('axios');
        const courseId = transaction.relatedId; 
        
        const parsedCourseId = parseInt(courseId);
        
        console.log(`Validating course ${parsedCourseId} in LMS...`);
        
        await axios.put(`http://localhost:5000/api/courses/${parsedCourseId}/validate`, {
          bankValidated: true
        });
        
        console.log(`Course ${parsedCourseId} marked as validated in LMS`);
      } catch (error) {
        console.error('Error updating course:', error.response?.data || error.message);
      }
    }

    res.json({ message: 'Transaction validated successfully', transaction });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});




// Reject transaction
router.post('/reject-transaction', async (req, res) => {
  try {
    const { transactionId } = req.body;
    
    const transaction = await Transaction.findByPk(transactionId);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    if (transaction.status !== 'pending') {
      return res.status(400).json({ message: 'Transaction already processed' });
    }

    transaction.status = 'rejected';
    await transaction.save();

    console.log(`Transaction ${transactionId} rejected`);

    // Handle course creation rejection
    if (transaction.transactionType === 'course_creation_reward' && transaction.relatedId) {
      try {
        const axios = require('axios');
        const courseId = transaction.relatedId;
        
        console.log(`📤 Notifying LMS to delete course ${courseId}...`);
        
        await axios.delete(
          `http://localhost:5000/api/courses/${courseId}/reject`,
          { timeout: 5000 }
        );
        
        console.log(`Course ${courseId} deleted from LMS`);
        
      } catch (notifyError) {
        console.error('Error notifying LMS to delete course:', notifyError.message);
      }
    }

    // Handle enrollment rejection - DELETE enrollment
    if (transaction.transactionType === 'course_enrollment' && transaction.relatedId) {
      try {
        const axios = require('axios');
        const enrollmentId = transaction.relatedId;
        
        console.log(`Notifying LMS to delete enrollment ${enrollmentId}...`);
        
        await axios.delete(
          `http://localhost:5000/api/enrollments/${enrollmentId}`,
          { timeout: 5000 }
        );
        
        console.log(`Enrollment ${enrollmentId} deleted - learner can enroll again`);
        
      } catch (notifyError) {
        console.error('Error deleting enrollment:', notifyError.message);
      }
    }

    res.json({ success: true, message: 'Transaction rejected successfully' });
  } catch (error) {
    console.error('Reject transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Reject enrollment from bank dashboard
router.post('/reject-enrollment/:enrollmentId', async (req, res) => {
  try {
    const { enrollmentId } = req.params;

    // Find transaction
    const transaction = await Transaction.findOne({
      where: {
        relatedId: enrollmentId.toString(),
        transactionType: 'course_enrollment',
        status: 'pending'
      }
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Refund learner
    const learnerAcc = await BankAccount.findOne({ 
      where: { accountNumber: transaction.fromAccount } 
    });
    
    if (learnerAcc) {
      learnerAcc.balance = (parseFloat(learnerAcc.balance) + parseFloat(transaction.amount)).toFixed(2);
      await learnerAcc.save();
    }

    // Mark as rejected
    transaction.status = 'rejected';
    await transaction.save();

    // Delete enrollment
    const axios = require('axios');
    await axios.delete(`http://localhost:5000/api/enrollments/${enrollmentId}`);

    res.json({ success: true, message: 'Enrollment rejected successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});



// GET all transactions (for bank admin to view all transactions)
router.get('/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      order: [['createdAt', 'DESC']],
      limit: 1000 // Limit to last 1000 transactions
    });
    
    res.json(transactions);
  } catch (error) {
    console.error('Get all transactions error:', error);
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

// Get transactions
router.get('/transactions/:accountNumber', async (req, res) => {
  try {
    const { accountNumber } = req.params;

    const transactions = await Transaction.findAll({
      where: {
        [Op.or]: [
          { fromAccount: accountNumber },
          { toAccount: accountNumber }
        ],
        status: 'approved' // Only show approved transactions to users
      },
      order: [['createdAt', 'DESC']]
    });

    res.json(transactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get LMS account balance
router.get('/lms-balance', async (req, res) => {
  try {
    const lmsAccount = await BankAccount.findOne({
      where: { accountNumber: LMS_ORG_ACCOUNT }
    });

    if (!lmsAccount) {
      return res.status(404).json({ message: 'LMS account not found' });
    }

    res.json({
      accountNumber: lmsAccount.accountNumber,
      balance: parseFloat(lmsAccount.balance)
    });
  } catch (error) {
    console.error('Get LMS balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;