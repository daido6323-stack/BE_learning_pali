const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'palipath_secret_key';

// Generate Token helper
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '30d' } // Token lasts 30 days
  );
};

// 1. REGISTER
exports.register = async (req, res) => {
  try {
    const { username, password, profileName } = req.body;

    if (!username || !password || !profileName) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin đăng ký.' });
    }

    const normalizedUsername = username.trim().toLowerCase();

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { username: normalizedUsername }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        username: normalizedUsername,
        password: hashedPassword,
        profileName: profileName.trim(),
        xp: 0,
        streak: 1
      }
    });

    const token = generateToken(user);

    res.status(201).json({
      message: 'Đăng ký thành công!',
      token,
      user: {
        id: user.id,
        username: user.username,
        profileName: user.profileName,
        xp: user.xp,
        streak: user.streak
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. LOGIN
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
    }

    const normalizedUsername = username.trim().toLowerCase();

    // Find user
    const user = await prisma.user.findUnique({
      where: { username: normalizedUsername }
    });

    if (!user) {
      return res.status(400).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Đăng nhập thành công!',
      token,
      user: {
        id: user.id,
        username: user.username,
        profileName: user.profileName,
        xp: user.xp,
        streak: user.streak
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. GET PROFILE (ME)
exports.getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin người dùng.' });
    }

    res.json({
      id: user.id,
      username: user.username,
      profileName: user.profileName,
      xp: user.xp,
      streak: user.streak
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. UPDATE PROFILE (XP, STREAK, NAME)
exports.updateProfile = async (req, res) => {
  try {
    const { profileName, xp, streak } = req.body;
    const updateData = {};

    if (profileName !== undefined) updateData.profileName = profileName.trim();
    if (xp !== undefined) updateData.xp = parseInt(xp);
    if (streak !== undefined) updateData.streak = parseInt(streak);

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData
    });

    res.json({
      message: 'Cập nhật tài khoản thành công!',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        profileName: updatedUser.profileName,
        xp: updatedUser.xp,
        streak: updatedUser.streak
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
