const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

// Przekazujemy API URL do widoków
const API_URL = process.env.API_URL || 'http://localhost:3001/api';
app.locals.apiUrl = API_URL;

app.get('/', (req, res) => {
  res.render('layout', { page: 'home.ejs' });
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.listen(PORT, () => {
  console.log(`Frontend działa na http://localhost:${PORT}`);
});
