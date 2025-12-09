const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('learner', 'instructor', 'bank'),
      allowNull: false
    },
    profile: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    bankAccount: {
      type: DataTypes.JSON,
      defaultValue: {
        accountNumber: null,
        secretCode: null,
        isSetup: false
      }
    }
  });

  User.associate = (models) => {
    User.hasMany(models.Course, {
      foreignKey: 'instructorId',
      as: 'courses'
    });
    User.hasMany(models.Enrollment, {
      foreignKey: 'learnerId',
      as: 'enrollments'
    });
  };

  return User;
};
