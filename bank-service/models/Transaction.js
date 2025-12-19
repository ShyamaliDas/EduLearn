const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  fromAccount: {
    type: DataTypes.STRING,
    allowNull: false
  },
  toAccount: {
    type: DataTypes.STRING,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  description: {
    type: DataTypes.STRING
  },
  status: {
    type: DataTypes.ENUM('pending', 'validated', 'approved', 'rejected', 'failed'),
    defaultValue: 'pending'
  },
  transactionType: {
    type: DataTypes.ENUM('course_creation_reward', 'course_enrollment', 'instructor_payment', 'bank_commission'),
    allowNull: true
  },
  relatedId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'courseId or enrollmentId'
  }
}, {
  tableName: 'transactions',
  timestamps: true
});

module.exports = Transaction;