const express = require('express');
const router = express.Router();
const path = require('path');
const { withErrorHandler } = require('../support/ErrorHandler');

router.get('/', withErrorHandler((req, res) => {
  res.sendFile(path.resolve(`${__dirname}/../view/login.html`));
}));

module.exports = router;
