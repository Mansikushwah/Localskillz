const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.post('/like-showcase', (req, res) => {
    const userId = req.user.user_id; // Retrieve user_id from the logged-in user
    const showcaseId = req.body.showcaseId; // Get the showcase ID from the request body

    if (!showcaseId) {
        return res.status(400).json({ error: "Showcase ID is required" });
    }

    // Step 1: Check if the user has already liked this showcase
    const checkLikeQuery = 'SELECT * FROM like_showcase WHERE user_id = ? AND showcase_id = ?';
    db.query(checkLikeQuery, [userId, showcaseId], (err, likeResults) => {
        if (err) {
            console.error('Error checking like status:', err);
            return res.status(500).json({ error: "Server error" });
        }

        if (likeResults.length > 0) {
            // Step 2: If already liked, remove the like
            const deleteLikeQuery = 'DELETE FROM like_showcase WHERE user_id = ? AND showcase_id = ?';
            db.query(deleteLikeQuery, [userId, showcaseId], (err, deleteResult) => {
                if (err) {
                    console.error('Error removing like:', err);
                    return res.status(500).json({ error: "Server error" });
                }

                // Step 3: Get the updated like count
                const likeCountQuery = 'UPDATE showcases SET likes = likes-1 WHERE showcase_id = ?';
                db.query(likeCountQuery, [showcaseId], (err, countResult) => {
                    if (err) {
                        console.error('Error fetching like count:', err);
                        return res.status(500).json({ error: "Server error" });
                    }
                    const Query = 'Select likes from showcases where showcase_id = ?';
                        db.query(Query, [showcaseId], (err, Result) => {
                            if (err) {
                            console.error('Error fetching like count:', err);
                            return res.status(500).json({ error: "Server error" });
                        }
                            res.json({ liked: false, like_count: Result[0].likes });
                        });
                });
            });
        } else {
            // Step 4: If not liked yet, insert the like into the table
            const insertLikeQuery = 'INSERT INTO like_showcase (user_id, showcase_id) VALUES (?, ?)';
            db.query(insertLikeQuery, [userId, showcaseId], (err, insertResult) => {
                if (err) {
                    console.error('Error inserting like:', err);
                    return res.status(500).json({ error: "Server error" });
                }

                // Step 5: Get the updated like count
                const likeCountQuery = 'UPDATE showcases SET likes = likes+1 WHERE showcase_id = ?';
                db.query(likeCountQuery, [showcaseId], (err, countResult) => {
                    if (err) {
                        console.error('Error fetching like count:', err);
                        return res.status(500).json({ error: "Server error" });
                    }
                    const Query = 'Select likes from showcases where showcase_id = ?';
                        db.query(Query, [showcaseId], (err, Result) => {
                            if (err) {
                            console.error('Error fetching like count:', err);
                            return res.status(500).json({ error: "Server error" });
                        } console.log(Result);
                            res.json({ liked: true, like_count: Result[0].likes });
                        });
                    });
            });
        }
    });
});


router.post('/like-post', (req, res) => {
    const userId = req.user.user_id; // Get the logged-in user's ID
    const postId = req.body.postId; // Get the post ID from the request body

    if (!postId) {
        return res.status(400).json({ error: "Post ID is required" });
    }

    // Step 1: Check if the user has already liked this post
    const checkLikeQuery = ' SELECT * FROM like_post WHERE user_id = ? AND post_id = ?';
    db.query(checkLikeQuery, [userId, postId], (err, likeResults) => {
        if (err) {
            console.error('Error checking like status:', err);
            return res.status(500).json({ error: "Server error" });
        }

        if (likeResults.length > 0) {
            // Step 2: If already liked, remove the like
            const deleteLikeQuery = 'DELETE FROM like_post WHERE user_id = ? AND post_id = ?';
            db.query(deleteLikeQuery, [userId, postId], (err, deleteResult) => {
                if (err) {
                    console.error('Error removing like:', err);
                    return res.status(500).json({ error: "Server error" });
                }

                // Step 3: Get the updated like count
                const likeCountQuery = 'UPDATE posts SET likes = likes-1 WHERE post_id = ?';
                db.query(likeCountQuery, [postId], (err, countResult) => {
                    if (err) {
                        console.error('Error fetching like count:', err);
                        return res.status(500).json({ error: "Server error" });
                    }
                    const Query = 'Select likes from posts where post_id = ?';
                    db.query(Query, [postId], (err, Result) => {
                        if (err) {
                        console.error('Error fetching like count:', err);
                        return res.status(500).json({ error: "Server error" });
                    } 
                        res.json({ liked: false, like_count: Result[0].likes });
                    });
                });
            });
        } else {
            // Step 4: If not liked yet, insert the like into the table
            const insertLikeQuery = 'INSERT INTO like_post (user_id, post_id) VALUES (?, ?)';
            db.query(insertLikeQuery, [userId, postId], (err, insertResult) => {
                if (err) {
                    console.error('Error inserting like:', err);
                    return res.status(500).json({ error: "Server error" });
                }

                // Step 5: Get the updated like count
                const likeCountQuery = 'UPDATE posts SET likes = likes+1 WHERE post_id = ?';
                db.query(likeCountQuery, [postId], (err, countResult) => {
                    if (err) {
                        console.error('Error fetching like count:', err);
                        return res.status(500).json({ error: "Server error" });
                    }
                    const Query = 'Select likes from posts where post_id = ?';
                    db.query(Query, [postId], (err, Result) => {
                        if (err) {
                        console.error('Error fetching like count:', err);
                        return res.status(500).json({ error: "Server error" });
                    } 
                        res.json({ liked: true, like_count: Result[0].likes });
                    });
                });
            });
        }
    });
});
module.exports = router;