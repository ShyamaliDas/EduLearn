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
      where: {
        learnerId: req.user.id,
        courseId: courseId
      }
    });

    if (existingEnrollment) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    // Get course details with duration
    const course = await Course.findByPk(courseId, {
      include: [{
        model: User,
        as: 'instructor',
        attributes: ['id', 'username', 'bankAccount']
      }]
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Get learner's bank account
    const learner = await User.findByPk(req.user.id);

    if (!learner.bankAccount.isSetup) {
      return res.status(400).json({ message: 'Please setup your bank account first' });
    }

    if (learner.bankAccount.secretCode !== bankSecret) {
      return res.status(400).json({ message: 'Invalid bank secret code' });
    }

    const calculateDeadline = (duration) => {
      const now = new Date();
      const durationMatch = duration.match(/(\d+)\s*(week|month|day|year)s?/i);
      
      if (!durationMatch) {
        now.setMonth(now.getMonth() + 3);
        return now;
      }
      
      const [, amount, unit] = durationMatch;
      const value = parseInt(amount);
      
      switch(unit.toLowerCase()) {
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
    console.log('🗓️ Enrollment deadline calculated:', deadline);

    try {
      const paymentResponse = await axios.post(
        `${process.env.BANK_SERVICE_URL}/api/bank/transfer`,
        {
          fromAccount: learner.bankAccount.accountNumber,
          toAccount: course.instructor.bankAccount.accountNumber,
          amount: course.price,
          description: `Enrollment fee for ${course.title}`
        }
      );

      if (paymentResponse.data.success) {
        const enrollment = await Enrollment.create({
          learnerId: req.user.id,
          courseId: courseId,
          transactionId: paymentResponse.data.transaction.id,
          deadline: deadline  
        });

        await course.increment('enrolledCount');

        const enrollmentWithDetails = await Enrollment.findByPk(enrollment.id, {
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

        res.status(201).json({
          message: 'Successfully enrolled in course',
          enrollment: enrollmentWithDetails,
          deadline: deadline.toLocaleDateString()
        });
      }
    } catch (bankError) {
      console.error('Bank service error:', bankError);
      return res.status(400).json({
        message: bankError.response?.data?.message || 'Payment failed'
      });
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


// Check if enrollment is still valid (before deadline)
router.get('/check-access/:courseId', auth, learnerAuth, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);

    const enrollment = await Enrollment.findOne({
      where: {
        learnerId: req.user.id,
        courseId: courseId
      },
      include: [
        {
          model: Course,
          as: 'course'
        }
      ]
    });

    if (!enrollment) {
      return res.status(404).json({ 
        message: 'Enrollment not found',
        hasAccess: false 
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

    // Calculate days remaining
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


// Get single enrollment details
router.get('/:id', auth, async (req, res) => {
  try {
    const enrollment = await Enrollment.findByPk(req.params.id, {
      include: [{
        model: Course,
        as: 'course',
        include: [{
          model: User,
          as: 'instructor',
          attributes: ['id', 'username', 'profile']
        }]
      }]
    });

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    if (enrollment.learnerId !== req.user.id && req.user.role !== 'instructor') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(enrollment);
  } catch (error) {
    console.error('Get enrollment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



router.post('/:id/quiz-score', auth, learnerAuth, async (req, res) => {
  try {
    const { materialId, score, totalQuestions } = req.body;

    console.log('🔍 Saving quiz score:', {
      enrollmentId: req.params.id,
      materialId,
      score,
      totalQuestions
    });

    const enrollment = await Enrollment.findByPk(req.params.id, {
      include: [{
        model: Course,
        as: 'course',
        include: [{
          model: User,
          as: 'instructor'
        }]
      }]
    });

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    if (enrollment.learnerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const existingQuizScores = enrollment.quizScores || {};
    console.log('📊 Existing quiz scores BEFORE update:', existingQuizScores);
    
    const percentage = Math.round((score / totalQuestions) * 100);
    
    // Merge new score with existing scores
    const updatedQuizScores = {
      ...existingQuizScores,  
      [materialId]: {
        score,
        totalQuestions,
        percentage,
        completedAt: new Date()
      }
    };

    console.log('📊 Updated quiz scores AFTER merge:', updatedQuizScores);

    const allMaterials = await Material.findAll({
      where: { courseId: enrollment.courseId }
    });

    console.log('📚 Total materials found:', allMaterials.length);

    const quizMaterials = allMaterials.filter(m => m.type === 'quiz');
    console.log('❓ Total quizzes:', quizMaterials.length);

    // Check if all quizzes are completed with 100%
    const allQuizzesCompleted = quizMaterials.length > 0 && quizMaterials.every(quiz => {
      const isComplete = updatedQuizScores[quiz.id]?.percentage === 100;
      console.log(`Quiz "${quiz.title}" (ID: ${quiz.id}): ${isComplete ? '✅ Complete' : '❌ Incomplete'} - ${updatedQuizScores[quiz.id]?.percentage || 0}%`);
      return isComplete;
    });

    console.log('🎯 All quizzes completed:', allQuizzesCompleted);

    // Calculate progress
    const completedQuizzes = Object.keys(updatedQuizScores).filter(
      id => updatedQuizScores[id].percentage === 100
    ).length;
    
    const progress = quizMaterials.length > 0
      ? Math.round((completedQuizzes / quizMaterials.length) * 100)
      : 0;

    console.log('📈 Progress:', progress, `(${completedQuizzes}/${quizMaterials.length} quizzes completed)`);

    await enrollment.update({
      quizScores: updatedQuizScores,  
      completed: allQuizzesCompleted,
      completedAt: allQuizzesCompleted ? new Date() : null,
      progress
    });

    console.log('✅ Enrollment updated successfully');

    // Fetch fresh enrollment with all data
    const freshEnrollment = await Enrollment.findByPk(enrollment.id, {
      include: [{
        model: Course,
        as: 'course',
        include: [{
          model: User,
          as: 'instructor',
          attributes: ['id', 'username', 'profile']
        }]
      }]
    });

    res.json({
      message: 'Quiz score saved successfully',
      enrollment: freshEnrollment,
      allQuizzesCompleted,
      progress
    });
  } catch (error) {
    console.error('❌ Update quiz score error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/:id/complete', auth, learnerAuth, async (req, res) => {
  try {
    console.log('🎓 Attempting to complete course, enrollmentId:', req.params.id);

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

    console.log('📚 Fetching materials for courseId:', enrollment.courseId);

    const allMaterials = await Material.findAll({
      where: { courseId: enrollment.courseId }
    });
    
    console.log('📊 Materials found:', allMaterials.length);

    const quizMaterials = allMaterials.filter(m => m.type === 'quiz');
    console.log('❓ Quiz materials:', quizMaterials.length);

    const quizScores = enrollment.quizScores || {};

    const allQuizzesCompleted = quizMaterials.length === 0
      ? true
      : quizMaterials.every(quiz => {
          const score = quizScores[quiz.id];
          const percentage = score?.percentage ?? 0;
          const isComplete = percentage === 100;
          console.log(
            `Quiz ${quiz.id} "${quiz.title}":`,
            isComplete ? '✅' : '❌',
            `(${percentage}%)`
          );
          return isComplete;
        });

    console.log('🎯 All quizzes completed:', allQuizzesCompleted);

    if (!allQuizzesCompleted) {
      return res.status(400).json({ 
        message: 'You must complete all quizzes with 100% before completing the course' 
      });
    }

    await enrollment.update({
      completed: true,
      completedAt: new Date(),
      progress: 100
    });


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

    console.log('✅ Course marked as complete!');
    console.log('👤 Learner data:', updatedEnrollment.learner);
    
    return res.json({ 
      message: 'Course completed successfully!', 
      enrollment: updatedEnrollment 
    });
  } catch (error) {
    console.error('❌ Complete course error:', error);
    res.status(500).json({ 
      message: 'Failed to complete course', 
      error: error.message 
    });
  }
});


// Get enrollment by course ID
router.get('/course/:courseId', auth, learnerAuth, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);

    console.log('Looking for enrollment:', {
      learnerId: req.user.id,
      courseId: courseId
    });

    const enrollment = await Enrollment.findOne({
      where: {
        learnerId: req.user.id,
        courseId: courseId
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
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    console.log('Found enrollment:', enrollment.id);
    console.log('Learner data:', enrollment.learner);
    res.json(enrollment);
  } catch (error) {
    console.error('Get enrollment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update progress
router.put('/:id/progress', auth, learnerAuth, async (req, res) => {
  try {
    const { progress } = req.body;

    const enrollment = await Enrollment.findByPk(req.params.id);

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    if (enrollment.learnerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await enrollment.update({
      progress,
      completed: progress >= 100,
      completedAt: progress >= 100 ? new Date() : null
    });

    res.json(enrollment);
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



module.exports = router;


