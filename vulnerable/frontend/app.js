const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { decodeAuthCookie } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const apiProxy = require('./routes/api');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use((req, res, next) => {
  res.locals.authPayload = decodeAuthCookie(req);
  next();
});

app.use('/', indexRouter);
app.use('/', authRouter);
app.use('/', apiProxy);

// 404 — no route matched
app.use((req, res) => {
  res.status(404).render('error', { status: 404, message: 'Page not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const status = err.status || 500;
  res.status(status).render('error', { status, message: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Frontend działa na http://localhost:${PORT}`);
});
