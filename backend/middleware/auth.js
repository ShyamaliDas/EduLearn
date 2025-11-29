const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const instructorAuth = (req, res, next) => {
  if (req.user.role !== 'instructor') {
    return res.status(403).json({ message: 'Access denied. Instructors only.' });
  }
  next();
};

const learnerAuth = (req, res, next) => {
  if (req.user.role !== 'learner') {
    return res.status(403).json({ message: 'Access denied. Learners only.' });
  }
  next();
};

module.exports = { auth, instructorAuth, learnerAuth };