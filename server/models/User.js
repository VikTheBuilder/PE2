/**
 * User Model
 * Handles user data operations
 */

const fs = require('fs').promises;
const { USERS_FILE } = require('../config/database');

// Read all users
const readUsers = async () => {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Return empty array if file doesn't exist
    return [];
  }
};

// Write users to file
const writeUsers = async (users) => {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
};

// Find user by ID
const findUserById = async (userId) => {
  const users = await readUsers();
  return users.find(u => u.id === userId);
};

// Find user by email
const findUserByEmail = async (email) => {
  const users = await readUsers();
  return users.find(u => u.email === email);
};

// Create new user
const createUser = async (userData) => {
  const users = await readUsers();
  users.push(userData);
  await writeUsers(users);
  return userData;
};

// Update user
const updateUser = async (userId, updateData) => {
  const users = await readUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    throw new Error('User not found');
  }
  
  users[userIndex] = { ...users[userIndex], ...updateData };
  await writeUsers(users);
  return users[userIndex];
};

// Delete user
const deleteUser = async (userId) => {
  const users = await readUsers();
  const updatedUsers = users.filter(u => u.id !== userId);
  await writeUsers(updatedUsers);
  return true;
};

module.exports = {
  readUsers,
  writeUsers,
  findUserById,
  findUserByEmail,
  createUser,
  updateUser,
  deleteUser
};