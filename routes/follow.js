const express = require('express');
const router = express.Router();
const db = require('../config/database');
router.post('/follows/:action', (req, res) => {
    const { action } = req.params;
    const { userId } = req.body; // userId is the ID of the user being followed/unfollowed
    const currentUserId = req.user.user_id; 

    // If the action is to follow, check if the user is already followed
    if (action === 'follow') {
        db.query(
            'SELECT * FROM follows WHERE follower_id = ? AND followed_id = ?', 
            [currentUserId, userId], 
            (err, results) => {
                if (err) {
                    console.error('Error details:', {
                        error: err.message,
                        userId: userId,
                        currentUserId: currentUserId,
                        action: action,
                    });
                    return res.json({ success: false, message: 'Error checking follow status' });
                }

                // If the relationship exists, toggle to unfollow
                if (results.length > 0) {
                    db.query(
                        'DELETE FROM follows WHERE follower_id = ? AND followed_id = ?', 
                        [currentUserId, userId], 
                        (err, result) => {
                            if (err) {
                                console.error('Error details:', {
                                    error: err.message,
                                    userId: userId,
                                    currentUserId: currentUserId,
                                    action: action,
                                });
                                return res.json({ success: false, message: 'Error unfollowing user' });
                            }
                            return res.json({ success: true, message: 'User unfollowed successfully' });
                        }
                    );
                } else {
                    // If it doesn't exist, insert a new follow relationship
                    db.query(
                        'INSERT INTO follows (follower_id, followed_id) VALUES (?, ?)', 
                        [currentUserId, userId], 
                        (err, result) => {
                            if (err) {
                                console.error('Error details:', {
                                    error: err.message,
                                    userId: userId,
                                    currentUserId: currentUserId,
                                    action: action,
                                });
                                return res.json({ success: false, message: 'Error following user' });
                            }
                            return res.json({ success: true, message: 'User followed successfully' });
                        }
                    );
                }
            }
        );
    } else {
        return res.status(400).json({ success: false, message: 'Invalid action' });
    }
});


module.exports = router;