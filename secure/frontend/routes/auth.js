const express = require('express');
const axios = require('axios');
const { API_URL } = require('../config');
const { getAxiosConfig } = require('../middleware/cookieForward');

const router = express.Router();
router.get('/login', (req, res) => {
  res.render('login.ejs', { error: null, next: req.query.next || '' });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const axiosConfig = getAxiosConfig(req);
    const response = await axios.post(
      `${API_URL}/api/auth/login`,
      { email, password },
      axiosConfig
    );
    const authToken = response.data.token;

    res.cookie('auth', authToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    const redirectTo = req.body.next || req.query.next || '/';
    res.redirect(redirectTo);
  } catch (error) {
    console.error('Login failed:', error.message);
    res.render('login.ejs', { error: error.response?.data?.error || 'Login failed', next: req.body.next || req.query.next || '' });
  }
});
router.get('/register', (req, res) => {
  res.render('register.ejs', { error: null });
});

router.post('/register', async (req, res) => {
  const { username, email, password, confirm_password } = req.body;

  try {
    const axiosConfig = getAxiosConfig(req);
    await axios.post(
      `${API_URL}/api/auth/register`,
      { username, email, password, confirm_password },
      axiosConfig
    );
    res.redirect('/login');
  } catch (error) {
    console.error('Registration failed:', error.message);
    res.render('register.ejs', { error: error.response?.data?.error || 'Registration failed' });
  }
});

router.get('/logout', async (req, res) => {
  try {
    const axiosConfig = getAxiosConfig(req);
    await axios.post(
      `${API_URL}/api/auth/logout`,
      {},
      {
        ...axiosConfig,
      }
    );
  } catch (error) {
    // Even if API logout fails, clear frontend cookie to complete local sign-out.
    console.warn('Backend logout failed:', error.response?.data?.error || error.message);
  }

  res.clearCookie('auth', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  res.redirect('/login');
});

router.get('/forgot-password', (req, res) => {
  res.render('forgot.ejs', { error: null, debugToken: null });
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const axiosConfig = getAxiosConfig(req);
    const response = await axios.post(`${API_URL}/api/auth/forgot-password`, { email }, axiosConfig);
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
    const axiosConfig = getAxiosConfig(req);
    const response = await axios.post(`${API_URL}/api/auth/reset-password`, {
      token,
      new_password,
    }, axiosConfig);
    res.render('reset.ejs', { token, error: null, success: response.data.message });
  } catch (error) {
    const msg = error.response?.data?.error || 'Reset failed';
    res.render('reset.ejs', { token, error: msg, success: null });
  }
});

module.exports = router;
