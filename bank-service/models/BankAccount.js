const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const BankAccount = sequelize.define('BankAccount', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  accountNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  ownerName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  balance: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  secretCode: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'bank_accounts',
  timestamps: true
});

module.exports = BankAccount;