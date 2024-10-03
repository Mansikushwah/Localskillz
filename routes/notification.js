const express = require('express');
const router = express.Router();
const db = require('../config/database');
router.get('/notification', async (req, res) => {
    const userId = req.user.user_id; // Get the user ID from the session or token

    try {
        const invitations = await new Promise((resolve, reject) => {
            db.query(
                `SELECT i.invitation_id, i.sender_id, s.username AS sender_username, i.receiver_id, 
                        i.status, i.created_at 
                 FROM invitations i 
                 JOIN users s ON i.sender_id = s.user_id 
                 WHERE i.receiver_id = ?`,
                [userId],
                (error, results) => {
                    if (error) {
                        console.error('Database error:', error);
                        return reject(error);
                    }
                    resolve(results);
                }
            );
        });

        res.render('notifications', { user: req.user, invitations });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});
router.post('/send_notification', async (req, res) => {
    const { receiverId,  message } = req.body;
    try {
        // Logic to insert a notification into the notifications table
        await db.query('INSERT INTO notifications (user_id, content) VALUES (?, ?)', [receiverId, message]);

        // Respond to the frontend with success
        res.status(200).json({ message: 'Notification sent successfully' });

        // (Optional) Emit real-time notification using Socket.IO
        // io.to(receiverId).emit('newNotification', message);

    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({ error: 'Failed to send notification' });
    }
});
module.exports = router;