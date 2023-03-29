const express = require('express');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');

const router = express.Router();

passport.use(
  new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
      // Find user by email
      const user = await User.findOne({ email });
      // If user doesn't exist, return error
      if (!user) {
        return done(null, false);
      }
      // Verify password
      const isValidPassword = await user.verifyPassword(password);
      // If password is incorrect, return error
      if (!isValidPassword) {
        return done(null, false);
      }
      // If everything is OK, return user object
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Registration page
router.get('/register', (req, res) => {
  res.render('register');
});

// Registration form submission
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, country, phoneNumber } = req.body;
    const user = new User({ name, email, password, country, phoneNumber });
    await user.save();
    res.redirect('/auth/login');
  } catch (error) {
    next(error);
  }
});

// Login page
router.get('/login', (req, res) => {
  res.render('login');
});

router.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/auth/login',
}));


// Logout route
router.get('/logout', (req, res) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.render('login');
  });

});

module.exports = router;
