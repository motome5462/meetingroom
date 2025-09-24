// require('dotenv').config();
// var createError = require('http-errors');
// var express = require('express');
// var path = require('path');
// var cookieParser = require('cookie-parser');
// var logger = require('morgan');
// var session = require('express-session');
// var mongoose = require('mongoose');

// var indexRouter = require('./routes/index');
// var scheduleRouter = require('./routes/schedule');
// var usersRouter = require('./routes/users');
// var insertRouter = require('./routes/insert');
// var authRouter = require('./routes/auth');
// var adminRouter = require('./routes/admin');

// var app = express();

// // view engine setup
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'ejs');

// app.use(logger('dev'));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());
// app.use(session({
//   secret: 'your-secret-key',
//   resave: false,
//   saveUninitialized: false
// }));

// // serve static files from /public
// app.use(express.static(path.join(__dirname, 'public')));

// // เชื่อมต่อ MongoDB
// mongoose.connect(process.env.DB_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// }).then(() => {
//   console.log('Connected to MongoDB');
// }).catch((err) => {
//   console.error('MongoDB connection error:', err);
// });

// // Middleware to make `user` variable available in all views
// app.use((req, res, next) => {
//   res.locals.user = req.session.user;
//   next();
// });

// // Routes
// app.use('/', indexRouter);
// app.use('/users', usersRouter);
// app.use('/schedule', scheduleRouter);  // all schedule routes prefixed by /schedule
// app.use('/insert', insertRouter);
// app.use('/auth', authRouter);
// app.use('/admin', adminRouter);

// // catch 404 and forward to error handler
// app.use(function(req, res, next) {
//   next(createError(404));
// });

// // error handler
// app.use(function(err, req, res, next) {
//   // set locals, only providing error in development
//   res.locals.message = err.message;
//   res.locals.error = req.app.get('env') === 'development' ? err : {};

//   // render the error page
//   res.status(err.status || 500);
//   res.render('error');
// });

// module.exports = app;

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const flash = require('connect-flash'); // ➕ เพิ่มการ import flash

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const insertRouter = require('./routes/insert');
const scheduleRouter = require('./routes/schedule');
const adminRouter = require('./routes/admin');
const authRouter = require('./routes/auth');
const userRouter = require('./routes/users');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // set to true if using https
}));

// ➕ ตั้งค่า connect-flash middleware
app.use(flash());

// ➕ ตั้งค่า global variables สำหรับ flash messages
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  next();
});

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/insert', insertRouter);
app.use('/schedule', scheduleRouter);
app.use('/admin', adminRouter);
app.use('/auth', authRouter);
app.use('/user', userRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  const createError = require('http-errors');
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;