const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Course = sequelize.define('Course', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    duration: {
      type: DataTypes.STRING,
      allowNull: false
    },
    level: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
      defaultValue: 'beginner'
    },
    image: {
      type: DataTypes.STRING,
      defaultValue: 'default-course.jpg'
    },
    enrolledCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    instructorId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  });

  Course.associate = (models) => {
    Course.belongsTo(models.User, {
      foreignKey: 'instructorId',
      as: 'instructor'
    });
    Course.hasMany(models.Enrollment, {
      foreignKey: 'courseId',
      as: 'enrollments'
    });
    Course.hasMany(models.Material, {
      foreignKey: 'courseId',
      as: 'materials'
    });
  };

  return Course;
};
