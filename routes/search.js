const express = require('express');
const router = express.Router();
const db = require('../config/database');
router.get('/people', (req, res) => {
    const id=req.user.user_id;
    console.log(req.user);
    const sql = `
        SELECT u.user_id, u.username, u.email, u.profile_photo, 
        GROUP_CONCAT(s.skill_name SEPARATOR ', ') AS skills
        FROM users u
        LEFT JOIN user_skills us ON u.user_id = us.user_id
LEFT JOIN skills s ON us.skill_id = s.skill_id
WHERE u.user_id != ? 
GROUP BY u.user_id;`;
    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Error fetching people:', err);
            return res.status(500).send('Server error');
        }
        console.log(results);
        res.render('people', { user: req.user, people: results });
    });
});

router.get('/people/search', (req, res) => {
    const searchQuery = req.query.skill || ''; // Get the search query from the request

    const sql = `
        SELECT u.username, u.email, u.profile_photo AS profile_photo, 
               GROUP_CONCAT(s.skill_name SEPARATOR ', ') AS skills
        FROM users u
        JOIN user_skills us ON u.user_id = us.user_id
        JOIN skills s ON us.skill_id = s.skill_id
        WHERE s.skill_name LIKE ?
        GROUP BY u.user_id, u.username, u.email, u.profile_photo`;

    db.query(sql, [`%${searchQuery}%`], (err, results) => {
        if (err) {
            console.error('Error fetching people:', err);
            return res.status(500).send('Server error');
        }

        // Build the HTML to send back to the client
        let html = '';
        if (results.length > 0) {
            results.forEach(person => {
                html += `
                    <div class="person-card">
                        <img src="${person.profile_photo_url || '/images/default_profile_photo.jpg'}" alt="${person.username}">
                        <h3>${person.username}</h3>
                        <p>Skills: ${person.skills}</p>
                        <p>Email: ${person.email}</p>
                    </div>`;
            });
        } else {
            html = '<p>No people found with that skill.</p>';
        }

        res.send(html); // Send the generated HTML back to the client
    });
});


router.get('/showcase', (req, res) => {
    const query = `
        SELECT 
            showcases.image_url, 
            users.username,
            users.user_id, 
            showcases.title, 
            showcases.description, 
            showcases.created_at, 
            GROUP_CONCAT(skills.skill_name SEPARATOR ', ') AS skills
        FROM showcases
        JOIN users ON showcases.user_id = users.user_id
        JOIN showcase_skills ON showcases.showcase_id = showcase_skills.showcase_id
        JOIN skills ON showcase_skills.skill_id = skills.skill_id
        GROUP BY showcases.showcase_id, showcases.image_url, users.username, users.user_id, showcases.title, showcases.description, showcases.created_at
        ORDER BY showcases.created_at DESC;
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching showcases:', err);
            return res.status(500).send('Server error');
        }

        res.render('showcase', { showcases: results, user: req.user });
    });
});

router.get('/post', (req, res) => {
    const query = `
        SELECT 
            posts.post_id,
            posts.title, 
            posts.content, 
            posts.created_at, 
            users.username, 
            users.user_id,
            GROUP_CONCAT(skills.skill_name SEPARATOR ', ') AS skills
        FROM posts
        JOIN users ON posts.user_id = users.user_id
        JOIN post_skills ON posts.post_id = post_skills.post_id
        JOIN skills ON post_skills.skill_id = skills.skill_id
        GROUP BY posts.post_id, posts.title, posts.content, posts.created_at, users.username
        ORDER BY posts.created_at DESC;
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching posts:', err);
            return res.status(500).send('Server error');
        }

        res.render('post', { posts: results, user: req.user });
    });
});

 
module.exports = router;