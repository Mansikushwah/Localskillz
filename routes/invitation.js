const express = require('express');
const router = express.Router();
const db = require('../config/database');
router.post('/invite', async (req, res) => {
    const { receiverId, senderId } = req.body;
    // const senderId = req.user.user_id;  Get the sender ID from the session or token

    if (!receiverId || !senderId) {
        return res.status(400).json({ error: 'Receiver ID and Post ID are required' });
    }

    try {
        const existingInvitation = await new Promise((resolve, reject) => {
            db.query(
                'SELECT * FROM invitations WHERE sender_id = ? AND receiver_id = ? ;',
                [senderId, receiverId],
                (error, results) => {
                    if (error) {
                        console.error('Database error:', error);
                        return reject(error);
                    }
                    resolve(results);
                }
            );
        });

        if (existingInvitation.length > 0) {
            const query = `
                UPDATE invitations
                SET status = ?
                WHERE sender_id = ? AND receiver_id = ?;
            `;
            
            db.execute(query, ['pending', senderId, receiverId], (err, result) => {
                if (err) {
                    return callback(err);
                }
        
                // Since this is an UPDATE query, result.insertId will not be available. You can return the updated rows count.
                if (result.affectedRows > 0) {
                    // Success: Invitation was updated
                    return res.status(200).json({ message: 'Invitation status updated to pending' });
                } else {
                    // No rows were updated
                    return res.status(400).json({ message: 'No invitation was updated' });
                }
            });
        } 
        
        // Insert a new invitation
        const result = await new Promise((resolve, reject) => {
            db.query(
                'INSERT INTO invitations (sender_id, receiver_id, status, created_at) VALUES (?, ?, ?, NOW())',
                [senderId, receiverId, 'pending'],
                (error, results) => {
                    if (error) {
                        console.error('Database error:', error);
                        return reject(error);
                    }
                    resolve(results);
                }
            );
        });

        res.status(201).json({ message: 'Invitation sent', invitationId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send invitation' });
    }
});
router.post('/invitations/respond', async (req, res) => {
    const { invitationId, response } = req.body;
    const validResponses = ['accepted', 'rejected'];

    if (!validResponses.includes(response)) {
        console.error('Invalid response:', response);
        return res.status(400).json({ error: 'Invalid response' });
    }

    try {
        // Update invitation status
        const updateResult = await new Promise((resolve, reject) => {
            db.query(
                'UPDATE invitations SET status = ? WHERE invitation_id = ?',
                [response, invitationId],
                (error, results) => {
                    if (error) {
                        console.error('Database error:', error);
                        return reject(error);
                    }
                    resolve(results);
                }
            );
        });

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ error: 'Invitation not found' });
        }

        // If accepted, create chat room and notify sender
        if (response === 'accepted') {
            const senderId = await new Promise((resolve, reject) => {
                db.query(
                    'SELECT sender_id FROM invitations WHERE invitation_id = ?',
                    [invitationId],
                    (error, results) => {
                        if (error) {
                            console.error('Database error:', error);
                            return reject(error);
                        }
                        if (results.length === 0) {
                            return reject(new Error('Sender not found'));
                        }
                        resolve(results[0].sender_id);
                    }
                );
            });

            // Check if chat room already exists
            const existingChatRoom = await new Promise((resolve, reject) => {
                db.query(
                    'SELECT * FROM chat_rooms WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)',
                    [req.user.user_id, senderId, senderId, req.user.user_id],
                    (error, results) => {
                        if (error) {
                            console.error('Database error:', error);
                            return reject(error);
                        }
                        resolve(results.length > 0);
                    }
                );
            });

            if (!existingChatRoom) {
                // Create a new chat room
                await new Promise((resolve, reject) => {
                    db.query(
                        'INSERT INTO chat_rooms (user1_id, user2_id) VALUES (?, ?)',
                        [req.user.user_id, senderId],
                        (error, results) => {
                            if (error) {
                                console.error('Database error:', error);
                                return reject(error);
                            }
                            resolve(results);
                        }
                    );
                });
            }

            // Notify the sender
            await new Promise((resolve, reject) => {
                db.query(
                    'INSERT INTO notifications (user_id, type, content) VALUES (?, ?, ?)',
                    [senderId, 'invitation', 'Your invitation was accepted. Start chatting!'],
                    (error, results) => {
                        if (error) {
                            console.error('Database error:', error);
                            return reject(error);
                        }
                        resolve(results);
                    }
                );
            });
        }

        res.status(200).json({ message: `Invitation ${response}` });
    } catch (error) {
        console.error('Error in /invitations/respond:', error);
        res.status(500).json({ error: 'Failed to respond to invitation' });
    }
});

module.exports = router;