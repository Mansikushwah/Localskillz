const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const dotenv = require('dotenv');
const flash = require('connect-flash');
// const cors = require('cors');

dotenv.config();

const app = express();
// const http = require('http');
// const socketIo = require('socket.io');

// app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());

app.set('view engine', 'ejs');


app.use(session({
    secret: 'SESSION_SECRET',
    resave: false,
    saveUninitialized: false
}));

app.use(flash());
app.use((req, res, next) => {
    res.locals.success_flash = req.flash('success');
    res.locals.error_flash = req.flash('error');
    next();
});

app.use(passport.initialize());
app.use(passport.session());
require('./config/passport')(passport);

app.use(express.static('public'));


app.use(require('./routes/about'));
app.use(require('./routes/another_profile'));
app.use(require('./routes/auth'));
// app.use(require('./routes/contact'));
app.use(require('./routes/home'));
app.use(require('./routes/index'));
app.use(require('./routes/invitation'));
app.use(require('./routes/my_profile'));
app.use(require('./routes/notification'));
app.use(require('./routes/post'));
app.use(require('./routes/profile_photo'));
app.use(require('./routes/search'));
app.use(require('./routes/showcase'));
app.use(require('./routes/skills'));
// app.use(require('./routes/services'));
const contactRoute = require('./routes/contact');
app.use(contactRoute);

// Debugging middleware
// app.use((req, res, next) => {
//     console.log(`Request URL: ${req.url}`);
//     next();
// });

// Create HTTP server and integrate Socket.IO
// const server = http.createServer(app);
// const io = socketIo(server);

// Socket.IO setup
// io.on('connection', (socket) => {
//     console.log('A user connected');

//     socket.on('sendMessage', ({ chatRoomId, message }) => {
//         // Emit the message to all clients in the chat room
//         io.emit('newMessage', {
//             chatRoomId,
//             username, 
//             message,
//             created_at: new Date()
//         });
//     });

//     socket.on('disconnect', () => {
//         console.log('A user disconnected');
//     });
// });
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
