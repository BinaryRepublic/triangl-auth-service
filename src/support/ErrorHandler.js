module.exports = {
  withErrorHandler,
  throwMissingParam
};

function withErrorHandler(controllerHandler) {
  return (req, res) => {
    try {
      controllerHandler(req, res);
    } catch (e) {
      if (e.statusCode) {
        res.status(e.statusCode);
        res.send(e.message || '');
      } else {
        throw e;
      }
    }
  }
}

function throwMissingParam(name) {
  throw { statusCode: 400, message: `parameter ${name} is missing` };
}
