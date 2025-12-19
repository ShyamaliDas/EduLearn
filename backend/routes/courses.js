const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { Course, User } = require('../models');
const { auth, instructorAuth } = require('../middleware/auth');



const uploadDir = 'uploads/courses/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Created uploads/courses/ directory');
}

// Multer config for course images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// GET all courses - only validated AND active courses
router.get('/', async (req, res) => {
  try {
    const courses = await Course.findAll({
      where: {
        bankValidated: true,
        status: 'active'
      },
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


// Get stats
router.get('/stats', async (req, res) => {
  try {
    const totalCourses = await Course.count({ where: { status: 'active' } });
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
          where: {
            courseId: course.id,
            paymentValidated: true // Only count validated enrollments
          }
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

// Create course - WITH BANK SECRET VERIFICATION
router.post('/', auth, instructorAuth, upload.single('image'), async (req, res) => {
  try {
    const instructor = await User.findByPk(req.user.id);

    if (!instructor.bankAccount.isSetup) {
      return res.status(403).json({
        message: 'Please setup your bank account before creating courses',
        needsBankSetup: true
      });
    }

    const { title, description, price, duration, level, bankSecret } = req.body;

    //  Verify bank secret code
    if (!bankSecret) {
      return res.status(400).json({ message: 'Bank secret code is required' });
    }

    if (instructor.bankAccount.secretCode !== bankSecret) {
      return res.status(400).json({ message: 'Invalid bank secret code' });
    }

    // Create course with PENDING status
    const course = await Course.create({
      title,
      description,
      price,
      duration,
      level,
      image: req.file ? req.file.filename : 'default-course.jpg',
      instructorId: req.user.id,
      status: 'pending' // Course starts as pending
    });

    // Notify bank - create pending transaction for 1500 TK reward
    try {
      const bankResponse = await axios.post(
        `${process.env.BANK_SERVICE_URL}/api/bank/course-creation-pending`,
        {
          instructorAccount: instructor.bankAccount.accountNumber,
          courseId: course.id,
          courseTitle: title
        }
      );

      // Store transaction ID in course
      course.pendingTransactionId = bankResponse.data.transactionId;
      await course.save();

      console.log('Course creation pending - waiting for bank validation');

      const courseWithInstructor = await Course.findByPk(course.id, {
        include: [{
          model: User,
          as: 'instructor',
          attributes: ['id', 'username', 'profile']
        }]
      });

      res.status(201).json({
        message: 'Course submitted! Pending bank validation. You will receive 1,500 TK reward once approved.',
        course: courseWithInstructor,
        status: 'pending'
      });

    } catch (bankError) {
      console.error('Bank notification failed:', bankError.message);

      // Mark course as rejected if bank notification fails
      course.status = 'rejected';
      await course.save();

      return res.status(500).json({
        message: 'Failed to process course creation. Please try again.',
        error: bankError.response?.data?.message || 'Bank service unavailable'
      });
    }

  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Validate course (called by bank-service)
router.put('/:id/validate', async (req, res) => {
  try {
    const courseId = req.params.id;

    const course = await Course.findByPk(courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Update BOTH fields
    course.bankValidated = true;
    course.status = 'active';
    await course.save();

    console.log(`Course ${courseId} (${course.title}) - Status: ${course.status}, Validated: ${course.bankValidated}`);

    res.json({
      message: 'Course validated and activated successfully',
      course: {
        id: course.id,
        title: course.title,
        status: course.status,
        bankValidated: course.bankValidated
      }
    });

  } catch (error) {
    console.error('Validate course error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});



// Get instructor stats
router.get('/instructor-stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'instructor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { Enrollment } = require('../models');

    const totalCourses = await Course.count({
      where: {
        instructorId: req.user.id,
        status: 'active'
      }
    });

    const courses = await Course.findAll({
      where: {
        instructorId: req.user.id,
        status: 'active'
      }
    });

    const totalStudents = await Enrollment.count({
      where: {
        courseId: courses.map(c => c.id),
        paymentValidated: true
      }
    });

    // Get actual bank balance
    let totalEarnings = 0;
    try {
      const user = await User.findByPk(req.user.id);
      if (user.bankAccount?.isSetup) {
        const balanceResponse = await axios.get(
          `${process.env.BANK_SERVICE_URL}/api/bank/balance/${user.bankAccount.accountNumber}`
        );
        totalEarnings = balanceResponse.data.balance || 0;
      }
    } catch (bankError) {
      console.error('Error fetching bank balance:', bankError);
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

// Reject and delete course (called by bank-service)
router.delete('/:id/reject', async (req, res) => {
  try {
    const courseId = req.params.id;

    const course = await Course.findByPk(courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const courseTitle = course.title;
    const instructorId = course.instructorId;

    // Delete the course completely
    await course.destroy();

    console.log(`Course ${courseId} (${courseTitle}) deleted after bank rejection`);

    res.json({
      message: 'Course rejected and deleted successfully',
      deletedCourse: {
        id: courseId,
        title: courseTitle,
        instructorId: instructorId
      }
    });

  } catch (error) {
    console.error('Reject course error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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