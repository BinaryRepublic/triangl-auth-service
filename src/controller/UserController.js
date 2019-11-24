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

router.get('/login', withErrorHandler(async (req, res) => {
  const userLoginDto = new UserLoginDto(req.query);

  const user = await userService.verifyUserCredentials(userLoginDto.email, userLoginDto.password);
  await userService.generateAndStoreAuthorizationCode(user.id);

  res.send();
}));

module.exports = router;
