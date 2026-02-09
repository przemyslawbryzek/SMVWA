const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

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

app.use('/', indexRouter);
app.use('/', authRouter);
app.use('/', apiProxy);

app.listen(PORT, () => {
  console.log(`Frontend działa na http://localhost:${PORT}`);
});
