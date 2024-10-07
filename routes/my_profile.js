const express = require('express');
const router = express.Router();
const db = require('../config/database');
router.get('/my_profile', (req, res) => {
    const user = req.user; 
        // Fetch skills for this user
        db.query('SELECT s.skill_id, s.skill_name FROM skills s JOIN user_skills us ON s.skill_id = us.skill_id WHERE us.user_id = ?', [user.user_id], (err, skillResults) => {
            if (err) throw err;
        
            const skills = skillResults;
        
            // Query to get showcases for the user
            db.query('SELECT showcase_id, title, description, image_url, created_at FROM showcases WHERE user_id = ?', [user.user_id], (err, showcaseResults) => {
                if (err) throw err;
        
                const showcases = showcaseResults;
                db.query('SELECT post_id, title, content, created_at FROM posts WHERE user_id = ?', [user.user_id], (err, postResults) => {
                    if (err) throw err;
            
                    const posts = postResults;
            
                    // Render profile page with user, skills, and showcases data
                    res.render('my_profile', { user, skills, showcases, posts });
                });
            });
        });
});
router.post('/update_profile', (req, res) => {
    const { username, availability } = req.body;
    if (!username || !availability) {
        return res.status(400).json({ success: false, message: 'Username and availability cannot be null' });
    }

    const sql = 'UPDATE users SET username = ?, availability = ? WHERE user_id = ?';
    db.query(sql, [username, availability, req.user.user_id], (err, result) => {
        if (err) {
            console.error('Error updating profile:', err);
            return res.status(500).json({ success: false, message: 'Database update failed' });
        }
        res.json({ success: true });
    });
});
module.exports = router;