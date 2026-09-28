const User = require('../models/User');

// @desc    Login user & get auth token (MongoDB backed)
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Query user directly from MongoDB
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      if (user.password !== password) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials. Please verify your password.',
        });
      }
    } else {
      // If user does not exist yet and password is valid, create a new user document in MongoDB
      if (password.length < 4) {
        return res.status(401).json({
          success: false,
          message: 'User not found and password must be at least 4 characters long to register',
        });
      }

      const usernamePart = normalizedEmail.split('@')[0];
      const formattedName = usernamePart.charAt(0).toUpperCase() + usernamePart.slice(1);

      user = await User.create({
        email: normalizedEmail,
        password,
        name: formattedName,
        role: 'Branch Staff / Loan Officer',
        branch: 'Surat Main Branch',
        avatarColor: '#2563eb',
        status: 'Online',
        dailyTarget: 35000,
      });
    }

    // Generate session token
    const token = 'dd_token_' + Buffer.from(user.email + ':' + Date.now()).toString('base64');

    const safeUser = user.toObject();
    delete safeUser.password;

    res.json({
      success: true,
      message: `Welcome back, ${safeUser.name}!`,
      token,
      user: safeUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during authentication',
    });
  }
};

// @desc    Get current user profile from MongoDB
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let user = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token.startsWith('dd_token_')) {
        const decoded = Buffer.from(token.replace('dd_token_', ''), 'base64').toString('ascii');
        const email = decoded.split(':')[0];
        if (email) {
          user = await User.findOne({ email: email.toLowerCase() }).select('-password');
        }
      }
    }

    if (!user) {
      user = await User.findOne().select('-password').sort({ createdAt: 1 });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found in database' });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user profile in MongoDB
// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const { email, name, phone, status, dailyTarget, avatarColor } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'User email is required' });
    }

    const updates = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (status) updates.status = status;
    if (dailyTarget !== undefined) updates.dailyTarget = Number(dailyTarget);
    if (avatarColor) updates.avatarColor = avatarColor;

    const updatedUser = await User.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found in database' });
    }

    res.json({
      success: true,
      message: 'Profile updated in database successfully',
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all staff/agents from MongoDB
// @route   GET /api/auth/users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ name: 1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
