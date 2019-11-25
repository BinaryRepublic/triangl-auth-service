const NODE_PORT = process.env.PORT || 3000;
const authConfig = require('./src/config/AuthConfig');

const express = require('express');
const app = express();

const { deepSanitize } = require('./src/support/XSSProtection');
const mung = require('express-mung');
app.use(mung.json(
  function transform(body) {
    deepSanitize(body);
    return body;
  }
));

app.use(function(req, res, next) {
  const origin = req.headers.origin;
  if(authConfig.allowedCorsUrls.indexOf(origin) > -1){
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Credentials', true);
  return next();
});

const bodyParser = require('body-parser');
app.use(bodyParser.json());

const authController = require('./src/controller/AuthController');
const userController = require('./src/controller/UserController');
const loginViewController = require('./src/controller/LoginViewController');

app.use('/auth', authController);
app.use('/user', userController);
app.use('/login', loginViewController);

app.use('/assets', express.static(`${__dirname}/src/view/assets`));

app.listen(NODE_PORT, function () {
  console.log(`Auth-service listening on port ${NODE_PORT}`);
});
