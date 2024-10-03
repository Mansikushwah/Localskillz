const express = require('express');
const router = express.Router();
const db = require('../config/database');
router.get('/another_profile/:user_id', (req, res) => {
    const id = req.user.user_id;
    const user_id = req.params.user_id;
    // Fetch the profile of the requested user
    const getUserQuery = `
        SELECT user_id, username, email, profile_photo, availability, rating, created_at 
        FROM users 
        WHERE user_id = ?;
    `;

    db.query(getUserQuery, [user_id], (err, userResults) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }       
        if (userResults.length === 0) {
            return res.status(404).send('Profile not found');
        }
        const userProfile = {
            user_id: userResults[0].user_id,
            username: userResults[0].username,
            email: userResults[0].email,
            profile_photo: userResults[0].profile_photo,
            availability: userResults[0].availability,
            rating: userResults[0].rating,
            created_at: userResults[0].created_at,
            skills: [],
            showcases: [],
            posts: [],
            invitations: []
        };

        // Fetch skills of the user
        const getUserSkillsQuery = `
            SELECT s.skill_name 
            FROM user_skills us
            JOIN skills s ON us.skill_id = s.skill_id
            WHERE us.user_id = ?;
        `;
        db.query(getUserSkillsQuery, [user_id], (err, skillsResults) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Server error');
            }
            userProfile.skills = skillsResults.map(skill => ({ skill_name: skill.skill_name }));

            // Fetch user's showcases
            const getUserShowcasesQuery = `
                SELECT 
                    sh.showcase_id, 
                    sh.title, 
                    sh.description, 
                    sh.image_url, 
                    sh.created_at 
                FROM showcases sh 
                WHERE sh.user_id = ?;
            `;
            db.query(getUserShowcasesQuery, [user_id], (err, showcasesResults) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Server error');
                }
                userProfile.showcases = showcasesResults.map(showcase => ({
                    showcase_id: showcase.showcase_id,
                    title: showcase.title,
                    description: showcase.description,
                    image_url: showcase.image_url,
                    created_at: showcase.created_at,
                    skills: []
                }));

                // Fetch showcase skills
                const getShowcaseSkillsQuery = `
                    SELECT ss.showcase_id, s.skill_name 
                    FROM showcase_skills ss
                    JOIN skills s ON ss.skill_id = s.skill_id
                    WHERE ss.showcase_id IN (?);
                `;
                const showcaseIds = showcasesResults.map(showcase => showcase.showcase_id);
                if (showcaseIds.length > 0) {
                    db.query(getShowcaseSkillsQuery, [showcaseIds], (err, showcaseSkillsResults) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).send('Server error');
                        }

                        showcaseSkillsResults.forEach(skill => {
                            const showcase = userProfile.showcases.find(sh => sh.showcase_id === skill.showcase_id);
                            if (showcase) {
                                showcase.skills.push({ skill_name: skill.skill_name });
                            }
                        });
                    });
                }

                // Fetch user posts
                const getUserPostsQuery = `
                    SELECT p.post_id, p.title, p.content, p.created_at 
                    FROM posts p 
                    WHERE p.user_id = ?;
                `;
                db.query(getUserPostsQuery, [user_id], (err, postsResults) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).send('Server error');
                    }
                    userProfile.posts = postsResults.map(post => ({
                        post_id: post.post_id,
                        title: post.title,
                        content: post.content,
                        created_at: post.created_at,
                        skills: []
                    }));

                    // Fetch post skills
                    const getPostSkillsQuery = `
                        SELECT ps.post_id, s.skill_name 
                        FROM post_skills ps
                        JOIN skills s ON ps.skill_id = s.skill_id
                        WHERE ps.post_id IN (?);
                    `;
                    const postIds = postsResults.map(post => post.post_id);
                    if (postIds.length > 0) {
                        db.query(getPostSkillsQuery, [postIds], (err, postSkillsResults) => {
                            if (err) {
                                console.error(err);
                                return res.status(500).send('Server error');
                            }
                            postSkillsResults.forEach(skill => {
                                const post = userProfile.posts.find(p => p.post_id === skill.post_id);
                                if (post) {
                                    post.skills.push({ skill_name: skill.skill_name });
                                }
                            });
                        });
                    }

                    // mere pass jo invitations aaye ha vo defauld status pending ha 
                    const getInvitationsQuery = `
                        SELECT * 
                        FROM invitations
                        WHERE (sender_id = ? AND receiver_id = ?)
                        OR (sender_id = ? AND receiver_id = ?);
                    `;
                    db.query(getInvitationsQuery, [id, user_id, user_id, id], (err, invitationsResults) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).send('Server error');
                        }
                        userProfile.invitations = invitationsResults.map(invite => ({
                            invitation_id: invite.invitation_id,
                            sender_id: invite.sender_id,
                            sender_name: invite.sender_name,
                            status: invite.status,
                        }));
                        res.render('another_profile', { profile: userProfile, user: req.user });
                    });
                });
            });
        });
    });
});
module.exports = router;