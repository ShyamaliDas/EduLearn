const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { Material, Course } = require('../models');
const { auth, instructorAuth } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.body.type || 'others';
    let folder = 'uploads/materials/';
    
    switch(type) {
      case 'video':
        folder += 'videos/';
        break;
      case 'audio':
        folder += 'audio/';
        break;
      case 'slide':
        folder += 'slides/';
        break;
      case 'image':
        folder += 'images/';
        break;
      default:
        folder += 'others/';
    }
    
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 
  },
  fileFilter: (req, file, cb) => {
    cb(null, true);
  }
});

// Get all materials for a course
router.get('/course/:courseId', auth, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId, 10);
    if (!courseId || Number.isNaN(courseId)) {
      return res.status(400).json({ message: 'Invalid courseId parameter' });
    }

    const materials = await Material.findAll({
      where: { courseId },
      order: [['order', 'ASC'], ['createdAt', 'ASC']],
    });

    res.json(materials);
  } catch (error) {
    console.error('Get materials error', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Get single material
router.get('/:id', auth, async (req, res) => {
  try {
    const material = await Material.findByPk(req.params.id);
    
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }
    
    res.json(material);
  } catch (error) {
    console.error('Get material error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create material (Instructor only)
router.post('/', auth, instructorAuth, upload.single('file'), async (req, res) => {
  try {
    const { title, type, courseId, content } = req.body;

    const course = await Course.findByPk(courseId);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructorId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Determine content URL
    let materialContent = content;
    if (req.file) {
      materialContent = `/uploads/materials/${getTypeFolder(type)}${req.file.filename}`;
    }

    const material = await Material.create({
      courseId,
      title,
      type,
      content: materialContent,
      quiz: type === 'quiz' ? JSON.parse(req.body.quiz || '[]') : []
    });

    res.status(201).json({
      message: 'Material added successfully',
      material
    });
  } catch (error) {
    console.error('Create material error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});

// Update material (Instructor only)
router.put('/:id', auth, instructorAuth, upload.single('file'), async (req, res) => {
  try {
    const material = await Material.findByPk(req.params.id, {
      include: [{
        model: Course,
        as: 'course'
      }]
    });

    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    if (material.course.instructorId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { title, type, content } = req.body;
    
    let materialContent = content || material.content;
    if (req.file) {
      materialContent = `/uploads/materials/${getTypeFolder(type)}${req.file.filename}`;
    }

    await material.update({
      title: title || material.title,
      type: type || material.type,
      content: materialContent,
      quiz: type === 'quiz' ? JSON.parse(req.body.quiz || '[]') : material.quiz
    });

    res.json(material);
  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete material (Instructor only)
router.delete('/:id', auth, instructorAuth, async (req, res) => {
  try {
    const material = await Material.findByPk(req.params.id, {
      include: [{
        model: Course,
        as: 'course'
      }]
    });

    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    if (material.course.instructorId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await material.destroy();
    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



// Helper function
function getTypeFolder(type) {
  switch(type) {
    case 'video': return 'videos/';
    case 'audio': return 'audio/';
    case 'slide': return 'slides/';
    case 'image': return 'images/';
    default: return 'others/';
  }
}

module.exports = router;
