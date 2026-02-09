const express = require('express');
const axios = require('axios');

const router = express.Router();
const API_URL = process.env.API_URL || 'http://localhost:3001/api';
router.get('/login', (req, res) => {
  res.render('login.ejs', { error: null });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, { email, password }, { withCredentials: true });
    const authToken = response.data.token;

    res.cookie('auth', authToken, { httpOnly: true, secure: false });
    res.redirect('/');
  } catch (error) {
    console.error('Login failed:', error.message);
    res.render('login.ejs', { error: error.response?.data?.error || 'Login failed' });
  }
});
router.get('/register', (req, res) => {
  res.render('register.ejs', { error: null });
});

router.post('/register', async (req, res) => {
  const { username, email, password, confirm_password } = req.body;

  try {
    const response = await axios.post(`${API_URL}/api/auth/register`, { username, email, password, confirm_password }, { withCredentials: true });
    res.redirect('/login');
  } catch (error) {
    console.error('Registration failed:', error.message);
    res.render('register.ejs', { error: error.response?.data?.error || 'Registration failed' });
  }
});

router.get('/logout', (req, res) => {
  res.clearCookie('auth');
  res.redirect('/login');
});
module.exports = router;