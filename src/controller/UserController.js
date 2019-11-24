const express = require('express');
const router = express.Router();
const { withErrorHandler } = require('../support/ErrorHandler');

const UserLoginDto = require('../dto/UserLoginDto');
const UserRegisterDto = require('../dto/UserRegisterDto');
const userService = require('../service/UserService');

router.post('/register', withErrorHandler(async (req, res) => {
  const userRegisterDto = new UserRegisterDto(req.body);

  await userService.registerUser(userRegisterDto.email, userRegisterDto.password);

  res.status(204);
  res.send()
}));

router.post('/login', withErrorHandler(async (req, res) => {
  const userLoginDto = new UserLoginDto(req.body);

  const user = await userService.verifyUserCredentials(userLoginDto.email, userLoginDto.password);
  const authorization_code = await userService.generateAndStoreAuthorizationCode(user.id);

  const redirect_uri = userService.constructAuthorizationCodeRedirectUri(
    userLoginDto.redirect_uri,
    authorization_code,
    userLoginDto.state
  );

  res.send({
    redirect_uri
  });
}));

module.exports = router;
