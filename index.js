const NODE_PORT = process.env.PORT || 3000;
const authConfig = require('./src/config/AuthConfig');

const express = require('express');
const app = express();

const cors = require('cors');
const corsOptions = {
  origin: authConfig.allowedCorsUrls.join(',')
};
app.use(cors(corsOptions));

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
