const express = require('express');
const axios = require('axios');
const { API_URL } = require('../config');

const router = express.Router();
router.get('/login', (req, res) => {
  res.render('login.ejs', { error: null });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const response = await axios.post(
      `${API_URL}/api/auth/login`,
      { email, password },
      { withCredentials: true }
    );
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
    await axios.post(
      `${API_URL}/api/auth/register`,
      { username, email, password, confirm_password },
      { withCredentials: true }
    );
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

router.get('/forgot-password', (req, res) => {
  res.render('forgot.ejs', { error: null, debugToken: null });
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const response = await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
    res.render('forgot.ejs', { error: null, debugToken: response.data.debug_token });
  } catch (error) {
    const msg = error.response?.data?.error || 'Something went wrong';
    res.render('forgot.ejs', { error: msg, debugToken: null });
  }
});

router.get('/reset-password', (req, res) => {
  const { token } = req.query;
  if (!token) {return res.redirect('/forgot-password');}
  res.render('reset.ejs', { token, error: null, success: null });
});

router.post('/reset-password', async (req, res) => {
  const { token, new_password } = req.body;
  try {
    const response = await axios.post(`${API_URL}/api/auth/reset-password`, {
      token,
      new_password,
    });
    res.render('reset.ejs', { token, error: null, success: response.data.message });
  } catch (error) {
    const msg = error.response?.data?.error || 'Reset failed';
    res.render('reset.ejs', { token, error: msg, success: null });
  }
});

module.exports = router;
