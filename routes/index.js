const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const db = require('../config/database');
router.use(bodyParser.urlencoded({ extended: true }));

// Handle GET request to /chat/:chatRoomId
// Helper function to run queries
const queryDatabase = (query, params) => {
    return new Promise((resolve, reject) => {
        db.query(query, params, (error, results) => {
            if (error) {
                return reject(error);
            }
            resolve(results);
        });
    });
};

//Function to find or create a chat room
const getOrCreateChatRoom = async (user1Id, user2Id) => {
    let chatRoom = await queryDatabase(
        'SELECT chat_room_id FROM chat_rooms WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)',
        [user1Id, user2Id, user2Id, user1Id]
    );

    if (chatRoom.length === 0) {
        const result = await queryDatabase(
            'INSERT INTO chat_rooms (user1_id, user2_id) VALUES (?, ?)',
            [user1Id, user2Id]
        );
        return result.insertId;
    }

    return chatRoom[0].chat_room_id;
};

// GET /chat/:chatRoomId - Render chat room with messages
router.get('/chat/:chatRoomId', async (req, res) => {
    const chatRoomId = parseInt(req.params.chatRoomId, 10);
    if (isNaN(chatRoomId)) {
        return res.status(400).json({ error: 'Invalid chat room ID' });
    }

    try {
        const messages = await queryDatabase(
            `SELECT m.message_id, m.sender_id, u.username, m.message, m.created_at 
            FROM messages m 
            JOIN users u ON m.sender_id = u.user_id 
            WHERE m.chat_room_id = ? 
            ORDER BY m.created_at ASC`,
            [chatRoomId]
        );

        res.render('chat', { chatRoomId, messages });
    } catch (error) {
        console.error('Error fetching chat room:', error);
        res.status(500).json({ error: 'Failed to fetch chat room messages' });
    }
});

// GET /messages/:chatRoomId - Fetch messages for a chat room
router.get('/messages/:chatRoomId', async (req, res) => {
    const chatRoomId = parseInt(req.params.chatRoomId, 10);
    if (isNaN(chatRoomId)) {
        return res.status(400).json({ error: 'Invalid chat room ID' });
    }

    try {
        const messages = await queryDatabase(
            `SELECT m.message_id, m.sender_id, u.username, m.message, m.created_at 
            FROM messages m 
            JOIN users u ON m.sender_id = u.user_id 
            WHERE m.chat_room_id = ? 
            ORDER BY m.created_at ASC`,
            [chatRoomId]
        );

        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// POST /messages - Post a new message
router.post('/messages', async (req, res) => {
    const { chatRoomId, message } = req.body;
    const senderId = req.user.user_id; // Assume user_id is set in req.user by authentication middleware

    if (!chatRoomId || isNaN(parseInt(chatRoomId, 10))) {
        return res.status(400).json({ error: 'Invalid or missing chat room ID' });
    }
    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Invalid or missing message text' });
    }

    try {
        // Verify if the chat room exists
        const chatRoom = await queryDatabase(
            'SELECT chat_room_id FROM chat_rooms WHERE chat_room_id = ?',
            [chatRoomId]
        );

        if (chatRoom.length === 0) {
            console.error('Chat room not found with ID:', chatRoomId); // Log chat room ID if not found
            return res.status(404).json({ error: 'Chat room not found' });
        }

        await queryDatabase(
            'INSERT INTO messages (chat_room_id, sender_id, message) VALUES (?, ?, ?)',
            [chatRoomId, senderId, message.trim()]
        );

        res.status(201).json({ message: 'Message sent' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// POST /start-chat - Initiate a chat with the post owner
router.post('/start-chat', async (req, res) => {
    const { postOwnerId } = req.body;
    const loggedInUserId = req.user.user_id; // Assume user_id is set in req.user by authentication middleware

    if (!postOwnerId || isNaN(parseInt(postOwnerId, 10))) {
        return res.status(400).json({ error: 'Invalid or missing post owner ID' });
    }

    try {
        const chatRoomId = await getOrCreateChatRoom(loggedInUserId, postOwnerId);
        res.json({ chatRoomId });
    } catch (error) {
        console.error('Error starting chat:', error);
        res.status(500).json({ error: 'Failed to start chat' });
    }
});
module.exports = router;