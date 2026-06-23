const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// ── POST /api/auth/register ──
// FR01: Register with full name, email, phone, password
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    // Check existing user
    const existing = await query('SELECT UserID FROM Users WHERE Email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Hash password (NFR03: bcrypt)
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert user
    const result = await query(
      'INSERT INTO Users (FirstName, LastName, Email, PasswordHash, PhoneNumber) VALUES (?, ?, ?, ?, ?)',
      [firstName, lastName, email, passwordHash, phone]
    );
    const userId = result.insertId;

    // Create wallet (FR04)
    await query(
      'INSERT INTO Accounts (UserID, Balance, LowBalanceThreshold) VALUES (?, 0.00, 50.00)',
      [userId]
    );

    // Create welcome notification
    await query(
      'INSERT INTO Notifications (UserID, Title, Message, Type) VALUES (?, ?, ?, ?)',
      [userId, 'Welcome to AVTPP!', 'Your account has been created successfully. Add a vehicle and top up your wallet to get started.', 'account']
    );

    // Generate JWT
    const token = jwt.sign(
      { userId, email, firstName, lastName },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: { userId, firstName, lastName, email, phone }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ── POST /api/auth/login ──
// FR02: Secure login with account lockout (NFR03: 5 failed attempts)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const users = await query('SELECT * FROM Users WHERE Email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = users[0];

    // Check account lockout (NFR03)
    if (user.LockedUntil && new Date(user.LockedUntil) > new Date()) {
      const remainingMs = new Date(user.LockedUntil) - new Date();
      const remainingMin = Math.ceil(remainingMs / 60000);
      return res.status(423).json({
        error: `Account locked. Try again in ${remainingMin} minute(s).`
      });
    }

    // Check if account is active
    if (!user.IsActive) {
      return res.status(403).json({ error: 'Account has been deactivated. Contact NRFA support.' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.PasswordHash);
    if (!validPassword) {
      // Increment failed attempts
      const attempts = (user.FailedLoginAttempts || 0) + 1;
      if (attempts >= 5) {
        // Lock for 15 minutes
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        await query(
          'UPDATE Users SET FailedLoginAttempts = ?, LockedUntil = ? WHERE UserID = ?',
          [attempts, lockUntil, user.UserID]
        );
        return res.status(423).json({
          error: 'Account locked due to too many failed attempts. Try again in 15 minutes.'
        });
      }
      await query('UPDATE Users SET FailedLoginAttempts = ? WHERE UserID = ?', [attempts, user.UserID]);
      return res.status(401).json({
        error: 'Invalid email or password.',
        attemptsRemaining: 5 - attempts
      });
    }

    // Reset failed attempts on successful login
    await query(
      'UPDATE Users SET FailedLoginAttempts = 0, LockedUntil = NULL WHERE UserID = ?',
      [user.UserID]
    );

    // Generate JWT
    const token = jwt.sign(
      { userId: user.UserID, email: user.Email, firstName: user.FirstName, lastName: user.LastName },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: {
        userId: user.UserID,
        firstName: user.FirstName,
        lastName: user.LastName,
        email: user.Email,
        phone: user.PhoneNumber,
        profilePicture: user.ProfilePicture || null
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ── GET /api/auth/profile ──
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const users = await query(
      'SELECT UserID, FirstName, LastName, Email, PhoneNumber, DateRegistered, IsActive, ProfilePicture FROM Users WHERE UserID = ?',
      [req.user.userId]
    );
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ user: users[0] });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// ── PUT /api/auth/profile ──
// Update the authenticated user's name and phone
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    if (!firstName || !lastName || !phone) {
      return res.status(400).json({ error: 'First name, last name and phone are required.' });
    }
    await query(
      'UPDATE Users SET FirstName = ?, LastName = ?, PhoneNumber = ? WHERE UserID = ?',
      [firstName, lastName, phone, req.user.userId]
    );
    res.json({ message: 'Profile updated.', user: { firstName, lastName, phone } });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// ── PUT /api/auth/change-password ──
// Change password while logged in (requires the current password)
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }
    const users = await query('SELECT PasswordHash FROM Users WHERE UserID = ?', [req.user.userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const valid = await bcrypt.compare(currentPassword, users[0].PasswordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    const hash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE Users SET PasswordHash = ? WHERE UserID = ?', [hash, req.user.userId]);
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

// ── PUT /api/auth/profile-picture ──
// Store a (downscaled) profile picture as a data URL
router.put('/profile-picture', authenticateToken, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
      return res.status(400).json({ error: 'A valid image is required.' });
    }
    if (image.length > 2_000_000) {
      return res.status(413).json({ error: 'Image is too large. Please choose a smaller picture.' });
    }
    await query('UPDATE Users SET ProfilePicture = ? WHERE UserID = ?', [image, req.user.userId]);
    res.json({ message: 'Profile picture updated.', profilePicture: image });
  } catch (err) {
    console.error('Profile picture error:', err);
    res.status(500).json({ error: 'Failed to update profile picture.' });
  }
});

// ── DELETE /api/auth/profile-picture ──
router.delete('/profile-picture', authenticateToken, async (req, res) => {
  try {
    await query('UPDATE Users SET ProfilePicture = NULL WHERE UserID = ?', [req.user.userId]);
    res.json({ message: 'Profile picture removed.' });
  } catch (err) {
    console.error('Remove picture error:', err);
    res.status(500).json({ error: 'Failed to remove profile picture.' });
  }
});

// ── POST /api/auth/forgot-password ──
// Self-service reset without email infrastructure (see scope §1.6.2): the user
// proves identity with their registered email + phone number, then sets a new
// password. In production this would be replaced by an emailed reset token.
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, phone, newPassword } = req.body;
    if (!email || !phone || !newPassword) {
      return res.status(400).json({ error: 'Email, phone number and a new password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    const users = await query(
      'SELECT UserID FROM Users WHERE Email = ? AND PhoneNumber = ?',
      [email, phone]
    );
    if (users.length === 0) {
      // Generic message — don't reveal which field was wrong
      return res.status(404).json({ error: 'No account matches that email and phone number.' });
    }
    const hash = await bcrypt.hash(newPassword, 12);
    await query(
      'UPDATE Users SET PasswordHash = ?, FailedLoginAttempts = 0, LockedUntil = NULL WHERE UserID = ?',
      [hash, users[0].UserID]
    );
    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// ── Admin Login ──
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const admins = await query('SELECT * FROM Admins WHERE Email = ?', [email]);
    if (admins.length === 0) {
      return res.status(401).json({ error: 'Invalid admin credentials.' });
    }

    const admin = admins[0];
    if (!admin.IsActive) {
      return res.status(403).json({ error: 'Admin account deactivated.' });
    }

    const valid = await bcrypt.compare(password, admin.PasswordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid admin credentials.' });
    }

    // Update last login
    await query('UPDATE Admins SET LastLogin = NOW() WHERE AdminID = ?', [admin.AdminID]);

    const token = jwt.sign(
      { adminId: admin.AdminID, email: admin.Email, name: admin.Name, role: admin.Role, isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      message: 'Admin login successful.',
      token,
      admin: { adminId: admin.AdminID, name: admin.Name, email: admin.Email, role: admin.Role }
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Admin login failed.' });
  }
});

module.exports = router;
