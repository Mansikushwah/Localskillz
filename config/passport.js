const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const User = require('../models/user');

module.exports = function(passport) {
    passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
        User.findByEmail(email, (err, user) => {
            if (err) return done(err);
            if (!user[0]) return done(null, false, { message: 'Incorrect email.' });
            bcrypt.compare(password, user[0].password, (err, isMatch) => {
                if (err) return done(err);
                if (isMatch) return done(null, user);
                return done(null, false, { message: 'Incorrect password.' });
            });
        });
    }));
    passport.serializeUser((user, done) =>{
        done(null, user[0].user_id);
    });
    
    passport.deserializeUser((id, done) => {
        User.findById(id, (err, user) => done(err, user));
    });
};
/*this is the guide to learn it
This code is configuring Passport.js for authentication using the LocalStrategy with email and password fields. It handles how users are authenticated, serialized, and deserialized in a Node.js application. 

1. passport.use(new LocalStrategy(...))
This defines a new local authentication strategy. Passport.js uses strategies to handle authentication in different ways (local, OAuth, etc.).
In this case, you're using a local strategy where the user logs in with their email and password.
We can create custom strategies as well.
2. usernameField: 'email'
This specifies that the username field in your login form is email, not the default username. Passport is flexible, so you can customize what field to use for identifying the user.
The username field in a login form is the input field where users enter their unique identifier, such as a username, email, or any other identification that your system uses to log in. It helps the application recognize which user is trying to authenticate.

By default, Passport.js (when using the LocalStrategy) expects a field named username for this purpose. However, this field can be customized (for example, to use email instead of username).
3. Callback Function (email, password, done)
This is the function that runs when a user tries to log in. It takes in the email and password entered by the user and checks if they match a stored user.
4. User.findByEmail(email, ...)
This is a function that looks up the user in the database by their email. The callback (err, user) is used to handle the result of the search.
If an error occurs during the lookup, return done(err) is called to pass the error to Passport.
If no user is found, return done(null, false, { message: 'Incorrect email.' }); is called, meaning authentication fails with a message.
5. bcrypt.compare(password, user[0].password, ...)
If the user is found, this line compares the provided password (from the login form) with the hashed password stored in the database using bcrypt.
If there's an error during the comparison, done(err) is called to handle the error.
If the password matches (isMatch is true), the user is successfully authenticated with done(null, user) (this passes the user object to Passport for further handling).
If the password does not match, it fails with the message "Incorrect password."
6. passport.serializeUser((user, done))
Serialization means storing user data in the session (i.e., how the user is identified between requests after logging in).
Here, user[0].user_id (the user's unique ID from the database) is stored in the session. This is what identifies the user in future requests.
The done(null, user[0].user_id) tells Passport to serialize the user using the user_id from the database.
7. passport.deserializeUser((id, done))
Deserialization means retrieving the user’s data from the session using the id stored during serialization.
When the user makes requests, Passport checks the session to see if the user is logged in. This function will retrieve the user's full data from the database based on the stored id.
The function User.findById(id, (err, user)) is used to find the user in the database by their ID, and done(err, user) will either pass the user object or an error back to the system.

------------------------------------------------------------------------------------
What this code does:
Local Strategy: Defines how to authenticate a user with an email and password.
Password Comparison: Uses bcrypt to compare the input password with the stored hashed password.
Session Handling:
Serialize User: Saves the user's ID to the session after successful login.
Deserialize User: Retrieves the full user data on subsequent requests using the stored ID.
Summary:
This code is part of the user authentication flow using Passport.js. It looks up a user by email, verifies the password using bcrypt, and then manages the session by storing and retrieving user information between requests.
*/