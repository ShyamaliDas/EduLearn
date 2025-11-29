const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

console.log('Starting server initialization...');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

console.log('Middleware configured');

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'LMS Backend API is running' });
});

console.log('Test route configured');

// Database and models
const db = require('./models');

// Create default instructors
const createDefaultInstructors = async () => {
  try {
    console.log('Creating default instructors...');
    
    const defaultInstructors = [
      {
        username: 'Instructor1',
        email: 'instructor1@edulearn.com',
        password: 'password123',
        role: 'instructor',
        profile: {
          name: 'Dr. M. Sohel Rahman',
          bio: 'Expert in Computer Science',
          qualification: 'PhD in Computer Science'
        }
      },
      {
        username: 'Instructor2',
        email: 'instructor2@edulearn.com',
        password: 'password123',
        role: 'instructor',
        profile: {
          name: 'Prof. Jamal Nazrul Islam',
          bio: 'Mathematics Professor',
          qualification: 'PhD in Mathematics'
        }
      },
      {
        username: 'Instructor3',
        email: 'instructor3@edulearn.com',
        password: 'password123',
        role: 'instructor',
        profile: {
          name: 'Dr. Bimal Kanti Paul',
          bio: 'Data Science Expert',
          qualification: 'PhD in Data Science'
        }
      }
    ];

    for (const instructor of defaultInstructors) {
      const existingUser = await db.User.findOne({ 
        where: { email: instructor.email } 
      });

      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(instructor.password, 10);
        await db.User.create({
          ...instructor,
          password: hashedPassword
        });
        console.log(`✅ Created instructor: ${instructor.username}`);
      } else {
        console.log(`ℹ️  Instructor already exists: ${instructor.username}`);
      }
    }

    console.log('✅ Default instructors setup complete');
  } catch (error) {
    console.error('❌ Error creating default instructors:', error);
  }
};

db.sequelize.sync({ alter: true }).then(async () => {
  console.log('✅ Database synced - All tables recreated');
  
  await createDefaultInstructors();
  
  const authRoutes = require('./routes/auth');
  const courseRoutes = require('./routes/courses');
  const enrollmentRoutes = require('./routes/enrollments');
  const materialRoutes = require('./routes/materials');
  const bankRoutes = require('./routes/bank');

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/courses', courseRoutes);
  app.use('/api/enrollments', enrollmentRoutes);
  app.use('/api/materials', materialRoutes);
  app.use('/api/bank', bankRoutes);
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


  console.log('All routes configured');

  // Start server
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`\n✅ Server running on port ${PORT}`);
    console.log(`📚 Default instructors available:`);
    console.log(`   - instructor1@edulearn.com / password123`);
    console.log(`   - instructor2@edulearn.com / password123`);
    console.log(`   - instructor3@edulearn.com / password123`);
  });
}).catch(err => {
  console.error('❌ Error syncing database:', err);
  process.exit(1);
});
