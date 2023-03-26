const express = require('express');
const mongoose = require('mongoose');
const app = express();
const methodOverride = require('method-override');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');


// Import routes
const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');



// Connect to MongoDB
mongoose.connect('mongodb+srv://root:root@recipe.4mg0eaj.mongodb.net/?retryWrites=true&w=majority', { useNewUrlParser: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));


// Set up sessions
app.use(session({
    secret: 'recipe',
    resave: true,
    saveUninitialized: true
  }));


// Set up middleware
// Initialize Passport and sessions
app.use(flash())
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(flash());





// Set up view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Set up routes
app.use('/', indexRouter);
app.use('/auth', authRouter);



// Start the server
app.listen(3000, () => console.log('Server started on port 3000'));

