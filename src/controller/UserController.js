const express = require('express');
const router = express.Router();
const { withErrorHandler } = require('../support/ErrorHandler');

const UserLoginDto = require('../dto/UserLoginDto');
const userService = require('../service/UserService');

router.get('/login', withErrorHandler(async (req, res) => {
  const userLoginDto = new UserLoginDto(req.query);

  const userCredentials = await userService.verifyUserCredentials(userLoginDto.email, userLoginDto.password);
  await userService.generateAndStoreAuthorizationCode(userCredentials.id);

  res.send();
}));

module.exports = router;
