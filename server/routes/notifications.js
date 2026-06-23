const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// ── GET /api/notifications ──
// FR08: List user notifications
router.get('/', async (req, res) => {
  try {
    const { unreadOnly } = req.query;
    let sql = 'SELECT * FROM Notifications WHERE UserID = ?';
    const params = [req.user.userId];

    if (unreadOnly === 'true') {
      sql += ' AND IsRead = FALSE';
    }
    sql += ' ORDER BY CreatedAt DESC LIMIT 50';

    const notifications = await query(sql, params);

    const unreadCount = await query(
      'SELECT COUNT(*) as count FROM Notifications WHERE UserID = ? AND IsRead = FALSE',
      [req.user.userId]
    );

    res.json({
      notifications,
      unreadCount: unreadCount[0].count
    });
  } catch (err) {
    console.error('Notifications error:', err);
    res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
});

// ── PUT /api/notifications/read-all ──
// Mark all notifications as read
// NOTE: Must be registered BEFORE /:id/read to prevent Express matching "read-all" as :id
router.put('/read-all', async (req, res) => {
  try {
    await query(
      'UPDATE Notifications SET IsRead = TRUE WHERE UserID = ? AND IsRead = FALSE',
      [req.user.userId]
    );
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
});

// ── PUT /api/notifications/:id/read ──
// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    await query(
      'UPDATE Notifications SET IsRead = TRUE WHERE NotificationID = ? AND UserID = ?',
      [req.params.id, req.user.userId]
    );
    res.json({ message: 'Notification marked as read.' });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Failed to update notification.' });
  }
});

module.exports = router;
