const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.loginPage = (req, res) => {
    res.render('login', { title: 'Login', user: req.session.user });
};

exports.login = async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.user = { username: user.username, role: user.role };
        return res.redirect('/admin/admindashboard');
    } else {
        return res.render('login', { error: 'Invalid credentials.' });
    }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
};

exports.registerPage = (req, res) => {
    res.render('register', { title: 'Register' });
};

exports.register = async (req, res) => {
    const { username, password, confirmPassword } = req.body;
    if (!username || !password || !confirmPassword) {
        return res.render('register', { error: 'All fields are required.' });
    }
    if (password !== confirmPassword) {
        return res.render('register', { error: 'Passwords do not match.' });
    }
    const userExists = await User.findOne({ username });
    if (userExists) {
        return res.render('register', { error: 'Username already exists.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ username, password: hashedPassword, role: 'admin' });
    return res.redirect('/auth/login');
};



