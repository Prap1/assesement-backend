const express = require('express');
const { login, register, logout } = require("../controller/authController");
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Register route
router.route("/register").post(register);

// Login route
router.route("/login").post(login);

// Logout route
router.route("/logout").post(protect,logout);

module.exports = router;
