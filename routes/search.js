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
    const radius = req.query.radius ? parseFloat(req.query.radius) : null; // Get the radius from the request
    const userLat = req.user.latitude; // Assume you have the user's latitude from their session or request
    const userLong = req.user.longitude; // Assume you have the user's longitude from their session or request

    // Base SQL query to find users and calculate distance
    let sql = `
        SELECT u.user_id, u.username, u.email, u.profile_photo AS profile_photo, 
               GROUP_CONCAT(s.skill_name SEPARATOR ', ') AS skills,
               (6371 * acos(cos(radians(?)) * cos(radians(u.latitude)) * cos(radians(u.longitude) - radians(?)) + sin(radians(?)) * sin(radians(u.latitude)))) AS distance
        FROM users u
        JOIN user_skills us ON u.user_id = us.user_id
        JOIN skills s ON us.skill_id = s.skill_id
    `;

    // Array to hold query parameters
    const queryParams = [userLat, userLong, userLat];

    // Dynamically add conditions based on whether skill and/or radius are provided
    let whereClauses = [];
    let havingClause = '';

    // If skill is provided, add it to the WHERE clause
    if (searchQuery) {
        whereClauses.push('s.skill_name LIKE ?');
        queryParams.push(`${searchQuery}%`); // Use wildcard after the search query for prefix matching
    }

    // If radius is provided, add it to the HAVING clause
    if (radius !== null) {
        havingClause = 'HAVING distance <= ?';
        queryParams.push(radius);
    }

    // Add the WHERE clauses (if any)
    if (whereClauses.length > 0) {
        sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    // Group by user to avoid duplicate rows due to skill joins
    sql += ' GROUP BY u.user_id, u.username, u.email, u.profile_photo ';

    // Add the HAVING clause if applicable
    if (havingClause) {
        sql += havingClause;
    }

    // Execute the query
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
            html = '<p>No people found matching your search criteria.</p>';
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
    IF(user_likes.user_id IS NOT NULL, true, false) AS userLiked,
    showcases.likes AS like_count
FROM showcases
JOIN users ON showcases.user_id = users.user_id
JOIN showcase_skills ON showcases.showcase_id = showcase_skills.showcase_id
JOIN skills ON showcase_skills.skill_id = skills.skill_id
LEFT JOIN like_showcase AS user_likes ON showcases.showcase_id = user_likes.showcase_id AND user_likes.user_id = ?
GROUP BY 
    showcases.showcase_id, 
    showcases.image_url, 
    users.username, 
    users.user_id, 
    showcases.title, 
    showcases.description, 
    showcases.created_at,
    showcases.likes
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
    // Ensure req.user is defined
    if (!req.user) {
        return res.status(401).send('User not authenticated'); // Respond with an error if the user is not authenticated
    }

    const searchQuery = req.query.skill || ''; // Get the search query, or empty string if not provided
    const radius = req.query.radius ? parseFloat(req.query.radius) : null; // Get the radius from the request, or null if not provided
    const userLat = req.user.latitude; // User's latitude from their session or request
    const userLong = req.user.longitude; // User's longitude from their session or request

    // Base SQL query to find showcases and calculate distance
    let sql = `
        SELECT s.showcase_id, s.title, s.description, s.image_url,
               u.user_id, u.username,
               u.latitude AS user_latitude, 
               u.longitude AS user_longitude,
               (6371 * acos(cos(radians(?)) * cos(radians(u.latitude)) * cos(radians(u.longitude) - radians(?)) + 
               sin(radians(?)) * sin(radians(u.latitude)))) AS distance,
               GROUP_CONCAT(DISTINCT sk.skill_name SEPARATOR ', ') AS skills,
               COUNT(likes.showcase_id) AS like_count,
               (SELECT COUNT(*) FROM like_showcase WHERE showcase_id = s.showcase_id AND user_id = ?) AS userLiked
        FROM showcases s
        JOIN users u ON s.user_id = u.user_id  -- Join with users table to access latitude and longitude
        LEFT JOIN showcase_skills ss ON s.showcase_id = ss.showcase_id  -- Join with showcase_skills to access skills
        LEFT JOIN skills sk ON ss.skill_id = sk.skill_id  -- Join with skills table to get skill names
        LEFT JOIN like_showcase likes ON s.showcase_id = likes.showcase_id AND likes.user_id = ?  -- Join to count likes specific to the current user
    `;

    // Query parameters for lat/long and user ID
    const queryParams = [userLat, userLong, userLat, req.user.user_id, req.user.user_id];

    // Build dynamic conditions for the query
    let whereClauses = [];
    let havingClause = '';

    // If a skill (substring) is provided, add it to the WHERE clause
    if (searchQuery) {
        // Use LIKE for prefix matching specifically for skills
        whereClauses.push('sk.skill_name LIKE ?');
        queryParams.push(`${searchQuery}%`); // Prepare the LIKE parameter with the substring followed by a wildcard
    }

    // If radius is provided, add it to the HAVING clause
    if (radius !== null) {
        havingClause = 'HAVING distance <= ?';
        queryParams.push(radius);
    }

    // Add WHERE clauses if there are any
    if (whereClauses.length > 0) {
        sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    // Add GROUP BY to ensure unique showcases and optionally add the HAVING clause for distance
    sql += ' GROUP BY s.showcase_id, u.user_id'; // Group by showcase_id and user_id to ensure unique rows

    // Add the HAVING clause if applicable
    if (havingClause) {
        sql += ' ' + havingClause;
    }

    // Optionally, order results by distance if radius is given
    sql += ' ORDER BY distance ASC';

    // Execute the query
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
                <div class="showcase" id="showcase-${showcase.showcase_id}">
                    <img src="${showcase.image_url || 'default_image_url.jpg'}" alt="${showcase.title}">
                    <a href="javascript:void(0);" data_user_id="${showcase.user_id}" onclick="viewProfile(this)" class="viewProfileBtn">${showcase.username}</a>
                    <h3>${showcase.title}</h3>
                    <div class="details">
                        <span><strong>Skill:</strong> ${showcase.skills || 'No skills available'}</span>
                        <span><strong>Description:</strong> ${showcase.description || 'No description available'}</span>
                        <span><strong>Date:</strong> ${new Date(showcase.created_at).toLocaleDateString() || 'Invalid Date'}</span>
                        <span><strong>Distance:</strong> ${showcase.distance ? showcase.distance.toFixed(2) : 'N/A'} km</span>
                    </div>
                    <button class="likeBtn" data-showcase-id="${showcase.showcase_id}" data-liked="${showcase.userLiked ? 'true' : 'false'}">
                        ${showcase.userLiked ? 'Unlike' : 'Like'}
                    </button>
                    <span class="likeCount" id="likeCount-${showcase.showcase_id}">Likes: ${showcase.likeCount || 0}</span>
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
        IF(user_likes.user_id IS NOT NULL, true, false) AS liked,
        posts.likes AS like_count
    FROM posts
    JOIN users ON posts.user_id = users.user_id
    LEFT JOIN post_skills ON posts.post_id = post_skills.post_id
    LEFT JOIN skills ON post_skills.skill_id = skills.skill_id
    LEFT JOIN like_post AS user_likes ON posts.post_id = user_likes.post_id AND user_likes.user_id = ? 
    LEFT JOIN like_post AS all_likes ON posts.post_id = all_likes.post_id 
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

router.get('/post/search', (req, res) => {
    // Ensure req.user is defined
    if (!req.user) {
        return res.status(401).send('User not authenticated'); // Respond with an error if the user is not authenticated
    }

    const searchQuery = req.query.skill ? req.query.skill.trim() : ''; // Get the search query, or empty string if not provided
    const radius = req.query.radius ? parseFloat(req.query.radius) : null; // Get the radius from the request, or null if not provided
    const userLat = req.user.latitude; // User's latitude from their session or request
    const userLong = req.user.longitude; // User's longitude from their session or request

    // Base SQL query to find posts and calculate distance
    let sql = `
        SELECT p.post_id, p.title, p.content, 
               GROUP_CONCAT(s.skill_name) AS skills, 
               p.created_at,
               u.user_id, u.username, u.profile_photo, 
               u.latitude AS user_latitude, 
               u.longitude AS user_longitude,
               (6371 * acos(cos(radians(?)) * cos(radians(u.latitude)) * cos(radians(u.longitude) - radians(?)) + 
               sin(radians(?)) * sin(radians(u.latitude)))) AS distance
        FROM posts p
        JOIN users u ON p.user_id = u.user_id  -- Join with users table to access latitude and longitude
        LEFT JOIN post_skills ps ON p.post_id = ps.post_id
        LEFT JOIN skills s ON ps.skill_id = s.skill_id
    `;

    // Query parameters for lat/long
    const queryParams = [userLat, userLong, userLat];

    // Build dynamic conditions for the query
    let whereClauses = [];
    let havingClause = '';

    // If a skill (substring) is provided, add it to the WHERE clause
    if (searchQuery) {
        // Use LIKE for prefix matching specifically for skills
        whereClauses.push('s.skill_name LIKE ?');
        const likeQuery = `${searchQuery}%`; // Prepare the LIKE parameter with the substring followed by a wildcard
        queryParams.push(likeQuery);
    }

    // If radius is provided, add it to the HAVING clause
    if (radius !== null) {
        havingClause = 'HAVING distance <= ?';
        queryParams.push(radius);
    }

    // Add WHERE clauses if there are any
    if (whereClauses.length > 0) {
        sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    // Add GROUP BY to ensure unique posts and optionally add the HAVING clause for distance
    sql += ' GROUP BY p.post_id'; // Group by post_id to ensure unique rows

    // Add the HAVING clause if applicable
    if (havingClause) {
        sql += ' ' + havingClause;
    }

    // Optionally, order results by distance if radius is given
    sql += ' ORDER BY distance ASC';

    // Debugging: Log the final SQL query and parameters
    console.log('SQL Query:', sql);
    console.log('Query Parameters:', queryParams);

    // Execute the query
    db.query(sql, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching posts:', err);
            return res.status(500).send('Server error');
        }

        // Build the HTML to send back to the client
        let html = '';
        if (results.length > 0) {
            results.forEach(post => {
                html += `
                    <div class="job-posting">
                        <div class="profile-photo">
                            <img src="${post.profile_photo || '/images/default_profile_photo.jpg'}" alt="Profile Photo">
                        </div>
                        <a href="javascript:void(0);" data_user_id="${post.user_id}" onclick="viewProfile(this)"
                            class="viewProfileBtn">${post.username}</a>
                        <div class="job-details">
                            <h2>${post.title}</h2>
                            <p><strong>Skills:</strong> ${post.skills || 'No skills listed'}</p>
                            <p><strong>Description:</strong> ${post.content}</p>
                            <p><strong>Posted:</strong> ${new Date(post.created_at).toLocaleDateString() || 'Date not available'}</p>
                            <p>Distance: ${post.distance.toFixed(2)} km</p>
                        </div>
                    </div>`;
            });
        } else {
            html = '<p>No posts found matching your criteria.</p>';
        }

        res.send(html); // Send the generated HTML back to the client
    });
});


module.exports = router;