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
    const radius = req.query.radius ? parseFloat(req.query.radius) : 0; // Get the radius from the request
    const userLat = req.user.latitude; // Assume you have the user's latitude from their session or request
    const userLong = req.user.longitude; // Assume you have the user's longitude from their session or request

    // SQL query to find users based on skill and calculate distance
    const sql = `
        SELECT u.user_id, u.username, u.email, u.profile_photo AS profile_photo, 
               GROUP_CONCAT(s.skill_name SEPARATOR ', ') AS skills,
               (6371 * acos(cos(radians(?)) * cos(radians(u.latitude)) * cos(radians(u.longitude) - radians(?)) + sin(radians(?)) * sin(radians(u.latitude)))) AS distance
        FROM users u
        JOIN user_skills us ON u.user_id = us.user_id
        JOIN skills s ON us.skill_id = s.skill_id
        WHERE s.skill_name LIKE ?
        GROUP BY u.user_id, u.username, u.email, u.profile_photo
        HAVING distance <= ?`;

    // Query parameters: user's latitude, longitude, user's latitude again for sine calculation, skill, and radius
    const queryParams = [userLat, userLong, userLat, `%${searchQuery}%`, radius];

    db.query(sql, queryParams, (err, results) => {
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
                        <img src="${person.profile_photo || '/images/default_profile_photo.jpg'}" alt="${person.username}">
                        <h3>${person.username}</h3>
                        <p>Skills: ${person.skills}</p>
                        <p>Email: ${person.email}</p>
                        <p>Distance: ${person.distance.toFixed(2)} km</p> <!-- Display distance -->
                    </div>`;
            });
        } else {
            html = '<p>No people found with that skill within the specified radius.</p>';
        }

        res.send(html); // Send the generated HTML back to the client
    });
});


router.get('/showcase', (req, res) => {
    const userId = req.user ? req.user.user_id : null; // Get the user ID if logged in
    const query = `
        SELECT 
            showcases.image_url,
            showcases.showcase_id, 
            users.username,
            users.user_id, 
            showcases.title, 
            showcases.description, 
            showcases.created_at, 
            GROUP_CONCAT(skills.skill_name SEPARATOR ', ') AS skills,
            IF(likes.user_id IS NOT NULL, true, false) AS userLiked,
            COUNT(likes.showcase_id) AS likeCount
        FROM showcases
        JOIN users ON showcases.user_id = users.user_id
        JOIN showcase_skills ON showcases.showcase_id = showcase_skills.showcase_id
        JOIN skills ON showcase_skills.skill_id = skills.skill_id
        LEFT JOIN like_showcase AS likes ON showcases.showcase_id = likes.showcase_id AND likes.user_id = ?
        GROUP BY showcases.showcase_id, showcases.image_url, users.username, users.user_id, showcases.title, showcases.description, showcases.created_at
        ORDER BY showcases.created_at DESC;
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching showcases:', err);
            return res.status(500).send('Server error');
        }

        res.render('showcase', { showcases: results, user: req.user });
    });
});

router.get('/showcase/search', (req, res) => {
    const searchQuery = req.query.skill ? `%${req.query.skill}%` : '%'; // Get the search query and set a default value for full search
    const radius = req.query.radius ? parseFloat(req.query.radius) : 0; // Get the radius from the request or default to 0
    const userLat = req.user.latitude; // User's latitude
    const userLong = req.user.longitude; // User's longitude

    // SQL query to find showcases based on skill and calculate distance
    const sql = `
        SELECT s.showcase_id, s.title, s.description, s.image_url,
               (6371 * acos(cos(radians(?)) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians(?)) + 
               sin(radians(?)) * sin(radians(s.latitude)))) AS distance
        FROM showcases s
        WHERE (s.title LIKE ? OR s.description LIKE ?)
        HAVING distance <= ?
        ORDER BY distance ASC`; // Optionally, you can order by distance

    // Query parameters: user's latitude, longitude, user's latitude again for sine calculation, skill pattern, and radius
    const queryParams = [userLat, userLong, userLat, searchQuery, searchQuery, radius];

    db.query(sql, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching showcases:', err);
            return res.status(500).send('Server error');
        }

        // Build the HTML to send back to the client
        let html = '';
        if (results.length > 0) {
            results.forEach(showcase => {
                html += `
                    <div class="showcaseItem" id="showcase-${showcase.showcase_id}">
                        <button class="removeShowcase" data-showcase-id="${showcase.showcase_id}">✖</button>
                        <span>${showcase.title}</span>
                        ${showcase.image_url ? 
                            `<img src="${showcase.image_url}" alt="Showcase Image" style="max-width: 200px; height: auto;">` : 
                            `<p>No image available</p>`
                        }
                        <div>${showcase.description}</div>
                        <p>Distance: ${showcase.distance ? showcase.distance.toFixed(2) : 'N/A'} km</p>
                    </div>`;
            });
        } else {
            html = '<p>No showcases found matching your criteria.</p>';
        }

        res.send(html); // Send the generated HTML back to the client
    });
});



router.get('/post', (req, res) => {
    const userId = req.user ? req.user.user_id : null; // Get the user ID if logged in
    const query = `
    SELECT 
        posts.post_id,
        posts.title, 
        posts.content, 
        posts.created_at, 
        users.username, 
        users.user_id, 
        users.profile_photo,
        GROUP_CONCAT(skills.skill_name SEPARATOR ', ') AS skills,
        IF(user_likes.user_id IS NOT NULL, true, false) AS liked, -- Current user like status
        COUNT(all_likes.post_id) AS like_count -- Total likes, no user filter
    FROM posts
    JOIN users ON posts.user_id = users.user_id
    LEFT JOIN post_skills ON posts.post_id = post_skills.post_id
    LEFT JOIN skills ON post_skills.skill_id = skills.skill_id
    LEFT JOIN like_post AS user_likes ON posts.post_id = user_likes.post_id AND user_likes.user_id = ? -- User-specific like
    LEFT JOIN like_post AS all_likes ON posts.post_id = all_likes.post_id -- All likes, no user filter
    GROUP BY posts.post_id, posts.title, posts.content, posts.created_at, users.username, users.user_id, users.profile_photo
    ORDER BY posts.created_at DESC;
`;

db.query(query, [userId], (err, results) => {
    if (err) {
        console.error('Error fetching posts:', err);
        return res.status(500).send('Server error');
    }

    res.render('post', { posts: results, user: req.user });
});  
});


module.exports = router;