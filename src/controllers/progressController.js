const prisma = require('../config/prisma');

exports.getProgressForCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const progress = await prisma.userProgress.findMany({
      where: { userId }
    });
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.upsertProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { lessonId, isCompleted } = req.body;
    const progress = await prisma.userProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId: parseInt(lessonId)
        }
      },
      update: {
        isCompleted: isCompleted || false,
        lastAccessed: new Date()
      },
      create: {
        userId,
        lessonId: parseInt(lessonId),
        isCompleted: isCompleted || false
      }
    });
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
