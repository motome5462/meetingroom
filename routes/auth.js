const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Employee = require('../models/employee'); // ucus
const bcrypt = require('bcrypt');

router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (user && await bcrypt.compare(password, user.password)) {
    req.session.user = {
      _id: user._id,
      username: user.username,
      role: user.role
    };
    if (user.role === 'admin') {
      return res.redirect('/admin/admindashboard');
    }
    res.redirect('/');
  } else {
    res.render('login', { error: 'Invalid username or password' });
  }
});

router.get('/register', (req, res) => {
  res.render('register', { error: null });
});

router.post('/register', async (req, res) => {
    try {
        const { username, password, role } = req.body;

        // Check if employeeid exists
        const employee = await Employee.findOne({ employeeid: username });
        if (!employee) {
            return res.render('register', { error: 'Employee ID not found.' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.render('register', { error: 'This employee ID is already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            username,
            password: hashedPassword,
            role: role || 'user'
        });
        await user.save();
        res.redirect('/auth/login');
    } catch (error) {
        res.status(500).render('register', { error: "Error registering new user please try again." });
    }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;