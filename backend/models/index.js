const Sequelize = require('sequelize');
const { sequelize } = require('../config/db');

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.User = require('./User')(sequelize);
db.Course = require('./Course')(sequelize);
db.Enrollment = require('./Enrollment')(sequelize);
db.Material = require('./Material')(sequelize);

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Sync database function
db.syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('Database synchronized');
  } catch (error) {
    console.error('Error syncing database:', error);
  }
};

module.exports = db;
