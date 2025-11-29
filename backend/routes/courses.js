const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const { Course, User } = require('../models');
const { auth, instructorAuth } = require('../middleware/auth');

// Multer config for course images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/courses/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Get all courses
router.get('/', async (req, res) => {
  try {
    const courses = await Course.findAll({
      include: [{
        model: User,
        as: 'instructor',
        attributes: ['id', 'username', 'profile']
      }],
      order: [['createdAt', 'DESC']]
    });
    res.json(courses);
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/stats', async (req, res) => {
  try {
    const totalCourses = await Course.count();

    const totalStudents = await User.count({
      where: { role: 'learner' }
    });

    const totalInstructors = await User.count({
      where: { role: 'instructor' }
    });

    res.json({
      totalCourses,
      totalStudents,
      totalInstructors
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



// Get instructor's courses
router.get('/instructor/my-courses', auth, instructorAuth, async (req, res) => {
  try {
    const { Enrollment } = require('../models');
    
    const courses = await Course.findAll({
      where: { instructorId: req.user.id },
      include: [{
        model: User,
        as: 'instructor',
        attributes: ['id', 'username', 'profile']
      }],
      order: [['createdAt', 'DESC']]
    });

    // Add enrolledCount to each course
    const coursesWithCount = await Promise.all(
      courses.map(async (course) => {
        const enrolledCount = await Enrollment.count({
          where: { courseId: course.id }
        });
        return {
          ...course.toJSON(),
          enrolledCount
        };
      })
    );

    res.json(coursesWithCount);
  } catch (error) {
    console.error('Get instructor courses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



// Get single course
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'instructor',
        attributes: ['id', 'username', 'profile']
      }]
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json(course);
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.post('/', auth, instructorAuth, upload.single('image'), async (req, res) => {
  try {
    const instructor = await User.findByPk(req.user.id);

    if (!instructor.bankAccount.isSetup) {
      return res.status(403).json({
        message: 'Please setup your bank account before creating courses',
        needsBankSetup: true
      });
    }

    const { title, description, price, duration, level } = req.body;

    const course = await Course.create({
      title,
      description,
      price,
      duration,
      level,
      image: req.file ? req.file.filename : 'default-course.jpg',
      instructorId: req.user.id
    });

    // Give instructor 1500 TK reward for creating course
    try {
      await axios.post(
        `${process.env.BANK_SERVICE_URL}/api/bank/add-funds`,
        {
          accountNumber: instructor.bankAccount.accountNumber,
          amount: 1500,
          description: `Reward for creating course: ${title}`
        }
      );
      console.log('Instructor rewarded 1500 TK for creating course');
    } catch (bankError) {
      console.error('Failed to reward instructor:', bankError.message);
    }

    const courseWithInstructor = await Course.findByPk(course.id, {
      include: [{
        model: User,
        as: 'instructor',
        attributes: ['id', 'username', 'profile']
      }]
    });

    res.status(201).json({
      message: 'Course created successfully! You received 1500 TK reward.',
      course: courseWithInstructor,
      reward: 1500
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get instructor stats
router.get('/instructor-stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'instructor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const totalCourses = await Course.count({
      where: { instructorId: req.user.id }
    });

    const courses = await Course.findAll({
      where: { instructorId: req.user.id }
    });

    const totalStudents = await Enrollment.count({
      where: {
        courseId: courses.map(c => c.id)
      }
    });

    // Calculate total earnings (sum of all course prices * enrollments)
    let totalEarnings = 0;
    for (const course of courses) {
      const enrollmentCount = await Enrollment.count({
        where: { courseId: course.id }
      });
      totalEarnings += course.price * enrollmentCount;
    }

    res.json({
      totalCourses,
      totalStudents,
      totalEarnings
    });
  } catch (error) {
    console.error('Get instructor stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



// Delete course (Instructor only)
router.delete('/:id', auth, instructorAuth, async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructorId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if course has enrolled students
    const { Enrollment } = require('../models');
    const enrollmentCount = await Enrollment.count({
      where: { courseId: req.params.id }
    });

    if (enrollmentCount > 0) {
      console.log(`Warning: Deleting course with ${enrollmentCount} enrolled students`);

      await Enrollment.destroy({
        where: { courseId: req.params.id }
      });
    }

    await course.destroy();
    res.json({
      message: 'Course deleted successfully',
      enrollmentsRemoved: enrollmentCount
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



// Update course (Instructor only)
router.put('/:id', auth, instructorAuth, upload.single('image'), async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructorId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { title, description, price, duration, level } = req.body;

    await course.update({
      title: title || course.title,
      description: description || course.description,
      price: price || course.price,
      duration: duration || course.duration,
      level: level || course.level,
      image: req.file ? req.file.filename : course.image
    });

    const updatedCourse = await Course.findByPk(course.id, {
      include: [{
        model: User,
        as: 'instructor',
        attributes: ['id', 'username', 'profile']
      }]
    });

    res.json(updatedCourse);
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
