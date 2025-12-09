const express = require('express');
const router = express.Router();
const axios = require('axios');
const { Enrollment, Course, User, Material } = require('../models');
const { auth, learnerAuth } = require('../middleware/auth');

// Enroll in course
router.post('/', auth, learnerAuth, async (req, res) => {
  try {
    const { courseId, bankSecret } = req.body;

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      where: { learnerId: req.user.id, courseId: courseId }
    });

    if (existingEnrollment) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    // Get course details
    const course = await Course.findByPk(courseId, {
      include: [{ model: User, as: 'instructor', attributes: ['id', 'username', 'bankAccount'] }]
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.status !== 'active') {
      return res.status(400).json({ message: 'This course is not available for enrollment' });
    }

    // Get learner's bank account
    const learner = await User.findByPk(req.user.id);

    if (!learner.bankAccount.isSetup) {
      return res.status(400).json({ message: 'Please setup your bank account first' });
    }

    if (learner.bankAccount.secretCode !== bankSecret) {
      return res.status(400).json({ message: 'Invalid bank secret code' });
    }

    // Calculate deadline
    const calculateDeadline = (duration) => {
      const now = new Date();
      const durationMatch = duration.match(/(\d+)\s*(week|month|day|years?)/i);

      if (!durationMatch) {
        now.setMonth(now.getMonth() + 3);
        return now;
      }

      const [, amount, unit] = durationMatch;
      const value = parseInt(amount);

      switch (unit.toLowerCase()) {
        case 'day':
          now.setDate(now.getDate() + value);
          break;
        case 'week':
          now.setDate(now.getDate() + (value * 7));
          break;
        case 'month':
          now.setMonth(now.getMonth() + value);
          break;
        case 'year':
          now.setFullYear(now.getFullYear() + value);
          break;
        default:
          now.setMonth(now.getMonth() + 3);
      }

      return now;
    };

    const deadline = calculateDeadline(course.duration);

    try {
      // Create enrollment with paymentValidated = false
      const enrollment = await Enrollment.create({
        learnerId: req.user.id,
        courseId: courseId,
        paymentValidated: false,
        deadline: deadline,
        transactionId: null
      });

      // Create pending transaction in bank
      const pendingResponse = await axios.post(
        `${process.env.BANK_SERVICE_URL}/api/bank/enrollment-pending`,
        {
          learnerAccount: learner.bankAccount.accountNumber,
          instructorAccount: course.instructor.bankAccount.accountNumber,
          amount: course.price,
          courseTitle: course.title,
          courseId: courseId,
          enrollmentId: enrollment.id
        }
      );

      if (pendingResponse.data.success) {
        enrollment.transactionId = pendingResponse.data.transactionId;
        await enrollment.save();

        const enrollmentWithDetails = await Enrollment.findByPk(enrollment.id, {
          include: [
            { model: Course, as: 'course', include: [{ model: User, as: 'instructor', attributes: ['id', 'username', 'profile'] }] },
            { model: User, as: 'learner', attributes: ['id', 'username', 'profile'] }
          ]
        });

        res.status(201).json({
          message: 'Enrollment submitted! Pending bank validation. Please wait for approval.',
          enrollment: enrollmentWithDetails,
          deadline: deadline.toLocaleDateString()
        });
      } else {
        await enrollment.destroy();
        return res.status(400).json({ message: 'Failed to create bank transaction' });
      }
    } catch (bankError) {
      console.error('Bank service error:', bankError);
      if (enrollment) await enrollment.destroy();
      return res.status(400).json({ message: bankError.response?.data?.message || 'Payment failed' });
    }
  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get learner's enrollments
router.get('/my-enrollments', auth, learnerAuth, async (req, res) => {
  try {
    const enrollments = await Enrollment.findAll({
      where: { learnerId: req.user.id },
      include: [{
        model: Course,
        as: 'course',
        include: [{
          model: User,
          as: 'instructor',
          attributes: ['id', 'username', 'profile']
        }]
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(enrollments);
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check if enrollment is still valid
router.get('/check-access/:courseId', auth, learnerAuth, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);

    const enrollment = await Enrollment.findOne({
      where: { learnerId: req.user.id, courseId: courseId },
      include: [{ model: Course, as: 'course' }]
    });

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found', hasAccess: false });
    }

    // Check if payment is validated
    if (!enrollment.paymentValidated) {
      return res.json({
        hasAccess: false,
        pending: true,
        message: 'Your enrollment is pending bank validation. Please wait...'
      });
    }

    // Check if deadline has passed
    const now = new Date();
    const deadline = new Date(enrollment.deadline);
    const hasExpired = now > deadline;

    if (hasExpired) {
      return res.json({
        hasAccess: false,
        expired: true,
        deadline: deadline,
        message: 'Your access to this course has expired. Please re-enroll to continue.'
      });
    }

    const daysRemaining = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

    res.json({
      hasAccess: true,
      expired: false,
      deadline: deadline,
      daysRemaining: daysRemaining,
      enrollment: enrollment
    });
  } catch (error) {
    console.error('Check access error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get enrollment by course ID
router.get('/course/:courseId', auth, learnerAuth, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);

    const enrollment = await Enrollment.findOne({
      where: {
        learnerId: req.user.id,
        courseId: courseId,
        //paymentValidated: true
      },
      include: [
        {
          model: Course,
          as: 'course',
          include: [{
            model: User,
            as: 'instructor',
            attributes: ['id', 'username', 'profile']
          }]
        },
        {
          model: User,
          as: 'learner',
          attributes: ['id', 'username', 'profile']
        }
      ]
    });

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found or not validated' });
    }

    if (!enrollment.paymentValidated) {
      return res.status(403).json({ 
        message: 'Enrollment pending validation',
        pending: true 
      });
    }

    res.json(enrollment);
  } catch (error) {
    console.error('Get enrollment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get enrollment by ID (for quiz submission)
router.get('/:id', auth, learnerAuth, async (req, res) => {
  try {
    const enrollment = await Enrollment.findByPk(req.params.id, {
      include: [
        {
          model: Course,
          as: 'course',
          include: [{
            model: User,
            as: 'instructor',
            attributes: ['id', 'username', 'profile']
          }]
        },
        {
          model: User,
          as: 'learner',
          attributes: ['id', 'username', 'profile']
        }
      ]
    });

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    if (enrollment.learnerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(enrollment);
  } catch (error) {
    console.error('Get enrollment by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Validate enrollment from bank
router.post('/:id/validate', async (req, res) => {
  try {
    const { transactionId, validated } = req.body;
    const enrollmentId = req.params.id;

    console.log(`Received validation request for enrollment ${enrollmentId}`);
    console.log(`Transaction ID: ${transactionId}, Validated: ${validated}`);

    const enrollment = await Enrollment.findByPk(enrollmentId);

    if (!enrollment) {
      console.log(`Enrollment ${enrollmentId} NOT FOUND`);
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    console.log(`Current paymentValidated status: ${enrollment.paymentValidated}`);

    if (validated) {
      enrollment.paymentValidated = true;
      await enrollment.save();

      console.log(`Enrollment ${enrollmentId} NOW VALIDATED!`);

      // Increment course enrolled count
      const course = await Course.findByPk(enrollment.courseId);
      if (course) {
        await course.increment('enrolledCount');
        console.log(`Course ${course.id} enrolled count incremented`);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Validate enrollment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Delete enrollment (when bank rejects)
router.delete('/:id', async (req, res) => {
  try {
    const enrollmentId = req.params.id;
    
    console.log(`Received request to delete enrollment ${enrollmentId}`);
    
    const enrollment = await Enrollment.findByPk(enrollmentId);
    
    if (!enrollment) {
      console.log(`Enrollment ${enrollmentId} not found`);
      return res.json({ success: true, message: 'Enrollment not found (may be already deleted)' });
    }

    if (enrollment.paymentValidated) {
      console.log(`cannot delete validated enrollment ${enrollmentId}`);
      return res.status(400).json({ message: 'Cannot delete validated enrollment' });
    }

    await enrollment.destroy();
    
    console.log(`Enrollment ${enrollmentId} deleted successfully`);
    
    res.json({ success: true, message: 'Enrollment deleted successfully' });
  } catch (error) {
    console.error('Delete enrollment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



// Complete course
router.put('/:id/complete', auth, learnerAuth, async (req, res) => {
  try {
    const enrollment = await Enrollment.findByPk(req.params.id, {
      include: [{
        model: Course,
        as: 'course',
        include: [{ model: User, as: 'instructor' }]
      }]
    });

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    if (enrollment.learnerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (!enrollment.paymentValidated) {
      return res.status(400).json({ message: 'Cannot complete course - enrollment not validated' });
    }

    // Mark as completed
    enrollment.completed = true;
    enrollment.completedAt = new Date();
    enrollment.progress = 100;
    await enrollment.save();

    const updatedEnrollment = await Enrollment.findByPk(enrollment.id, {
      include: [
        {
          model: Course,
          as: 'course',
          include: [{
            model: User,
            as: 'instructor',
            attributes: ['id', 'username', 'profile']
          }]
        },
        {
          model: User,
          as: 'learner',
          attributes: ['id', 'username', 'profile']
        }
      ]
    });

    res.json({
      message: 'Course completed successfully!',
      enrollment: updatedEnrollment
    });
  } catch (error) {
    console.error('Complete course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Save quiz score
router.post('/:id/quiz-score', auth, learnerAuth, async (req, res) => {
  try {
    const { materialId, score, totalQuestions } = req.body;

    const enrollment = await Enrollment.findByPk(req.params.id, {
      include: [{
        model: Course,
        as: 'course',
        include: [{ model: User, as: 'instructor' }]
      }]
    });

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    if (enrollment.learnerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (!enrollment.paymentValidated) {
      return res.status(400).json({ message: 'Cannot submit quiz - enrollment not validated' });
    }

    const existingQuizScores = enrollment.quizScores || {};
    const percentage = Math.round((score / totalQuestions) * 100);

    const updatedQuizScores = {
      ...existingQuizScores,
      [materialId]: {
        score,
        totalQuestions,
        percentage,
        completedAt: new Date()
      }
    };

    const allMaterials = await Material.findAll({
      where: { courseId: enrollment.courseId }
    });

    const quizMaterials = allMaterials.filter(m => m.type === 'quiz');

    const allQuizzesCompleted = quizMaterials.length > 0 && quizMaterials.every(quiz => {
      return updatedQuizScores[quiz.id]?.percentage === 100;
    });

    const completedQuizzes = Object.keys(updatedQuizScores).filter(
      id => updatedQuizScores[id].percentage === 100
    ).length;

    const progress = quizMaterials.length > 0
      ? Math.round((completedQuizzes / quizMaterials.length) * 100)
      : 0;

    await enrollment.update({
      quizScores: updatedQuizScores,
      completed: allQuizzesCompleted,
      completedAt: allQuizzesCompleted ? new Date() : null,
      progress
    });

    const freshEnrollment = await Enrollment.findByPk(enrollment.id, {
      include: [{
        model: Course,
        as: 'course',
        include: [{ model: User, as: 'instructor', attributes: ['id', 'username', 'profile'] }]
      }]
    });

    res.json({
      message: 'Quiz score saved successfully',
      enrollment: freshEnrollment,
      allQuizzesCompleted,
      progress
    });
  } catch (error) {
    console.error('Update quiz score error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;