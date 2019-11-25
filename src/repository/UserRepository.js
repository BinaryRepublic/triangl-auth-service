const uuidv4 = require('uuid/v4');
const knex = require('../support/Knex');

const TABLES = {
  user: 'user'
};

module.exports = {
  getUserById,
  createUser,
  getUserByEmail,
  storeAuthorizationCode,
  getUserByAuthorizationCode,
  dropAuthorizationCodeForUser
};

async function createUser(email, password) {
  await knex(TABLES.user).insert({
    id: uuidv4(),
    email,
    password,
    created_at: new Date().toISOString()
  })
}

async function getUserById(id) {
  const users = await knex(TABLES.user)
    .select('id', 'email')
    .where('id', id);
  return users[0] || null;
}

async function getUserByEmail(email) {
  const users = await knex(TABLES.user)
    .select('id', 'email', 'password')
    .where('email', email);
  return users[0] || null;
}

async function storeAuthorizationCode(userId, authorization_code) {
  await knex(TABLES.user)
    .where('id', userId)
    .update({
      authorization_code
    })
}

async function getUserByAuthorizationCode(authorization_code) {
  const users = await knex(TABLES.user)
    .select('id', 'email')
    .where('authorization_code', authorization_code);
  return users[0] || null;
}

async function dropAuthorizationCodeForUser(id) {
  await knex(TABLES.user)
    .where('id', id)
    .update({
      authorization_code: null
    })
}
