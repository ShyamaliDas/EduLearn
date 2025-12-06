const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { sequelize, testConnection } = require('./config/db');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "https://edulearn.onrender.com"]
}));
app.use(express.json());

// Database connection
const initializeDatabase = async () => {
  await testConnection();
  await sequelize.sync({ alter: true });
  console.log('Bank database synchronized');
};

initializeDatabase();

app.get('/', (req, res) => {
  res.send('Bank Service is active and running!');
});

// Routes
app.use('/api/bank', require('./routes/bank'));

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`Bank Service running on port ${PORT}`);
});
