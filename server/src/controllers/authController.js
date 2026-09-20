// Predefined Accounts for DD-Finserve Portal
const DEMO_USERS = [
  {
    email: 'admin@ddfinserve.com',
    password: 'admin123',
    name: 'Vaibhav Bodara',
    role: 'Branch Manager & Administrator',
    branch: 'Surat Main Branch',
    employeeId: 'DDF-MGR-001',
    avatarColor: '#2563eb',
    status: 'Online',
    dailyTarget: 50000,
  },
  {
    email: 'officer@ddfinserve.com',
    password: 'officer123',
    name: 'Priya Sharma',
    role: 'Senior Loan Officer',
    branch: 'Surat Main Branch',
    employeeId: 'DDF-LO-002',
    avatarColor: '#10b981',
    status: 'Online',
    dailyTarget: 40000,
  },
  {
    email: 'agent@ddfinserve.com',
    password: 'agent123',
    name: 'Agent Rahul',
    role: 'Field Collection Agent',
    branch: 'Surat Main Branch',
    employeeId: 'DDF-FCA-003',
    avatarColor: '#f59e0b',
    status: 'On Field',
    dailyTarget: 25000,
  },
];

// @desc    Login user & get auth token
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

    // Check predefined users
    let user = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === normalizedEmail && u.password === password
    );

    // If not matching predefined exactly, accept if password is at least 4 chars
    if (!user) {
      const predefinedByEmail = DEMO_USERS.find((u) => u.email.toLowerCase() === normalizedEmail);
      if (predefinedByEmail) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password. Hint for demo: password is ' + predefinedByEmail.password,
        });
      }

      if (password.length < 4) {
        return res.status(401).json({
          success: false,
          message: 'Password must be at least 4 characters long',
        });
      }

      // Generate user for new email
      const usernamePart = normalizedEmail.split('@')[0];
      const formattedName = usernamePart.charAt(0).toUpperCase() + usernamePart.slice(1);
      user = {
        email: normalizedEmail,
        name: formattedName,
        role: 'Branch Staff / Loan Officer',
        branch: 'Surat Main Branch',
        employeeId: 'DDF-STAFF-' + Math.floor(100 + Math.random() * 900),
        avatarColor: '#2563eb',
        status: 'Online',
        dailyTarget: 35000,
      };
    }

    // Generate session token
    const token = 'dd_token_' + Buffer.from(user.email + ':' + Date.now()).toString('base64');

    const safeUser = { ...user };
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

// @desc    Get current user profile
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({
    success: true,
    user: DEMO_USERS[0],
  });
};
