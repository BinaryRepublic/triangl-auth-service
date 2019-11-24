const Knex = require('knex');
const AuthConfig = require('../config/AuthConfig');

const {
  host,
  user,
  password,
  database
} = AuthConfig.db;

const config = {
  host,
  user,
  password,
  database
};

module.exports = Knex({
  client: 'mysql',
  connection: config,
});
