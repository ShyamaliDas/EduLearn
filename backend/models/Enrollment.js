const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Enrollment = sequelize.define('Enrollment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    learnerId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    courseId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    progress: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    transactionId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    quizScores: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    deadline: {
      type: DataTypes.DATE,
      allowNull: true
    }
  });

  Enrollment.associate = (models) => {
    Enrollment.belongsTo(models.User, {
      foreignKey: 'learnerId',
      as: 'learner'
    });
    Enrollment.belongsTo(models.Course, {
      foreignKey: 'courseId',
      as: 'course'
    });
  };

  return Enrollment;
};
