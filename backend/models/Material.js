const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Material = sequelize.define('Material', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    courseId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('video', 'audio', 'slide', 'image', 'text', 'quiz'),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    quiz: {
      type: DataTypes.JSON,
      defaultValue: []
    }
  });

  Material.associate = (models) => {
    Material.belongsTo(models.Course, {
      foreignKey: 'courseId',
      as: 'course'
    });
  };

  return Material;
};
