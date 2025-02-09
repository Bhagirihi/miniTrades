const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const USERS_FILE = path.join(__dirname, "../data/users.json");
const SECRET_KEY = "REGISTER_ROCKET"; // 🔹 Use environment variables in production

/**
 * ✅ Read Users File
 */
const readUsersFile = () => {
  if (!fs.existsSync(USERS_FILE))
    fs.writeFileSync(USERS_FILE, JSON.stringify({ users: [] }));
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
};

/**
 * ✅ Write Users File
 */
const writeUsersFile = (data) =>
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));

/**
 * ✅ Register User
 */
exports.register = (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name)
    return res.status(400).json({ message: "All fields are required" });

  const usersData = readUsersFile();
  if (usersData.users.some((user) => user.email === email)) {
    return res.status(400).json({ message: "User already exists" });
  }

  usersData.users.push({
    email,
    password: bcrypt.hashSync(password, 10),
    name,
  });
  writeUsersFile(usersData);
  res.status(201).json({ message: "User registered successfully" });
};

/**
 * ✅ Login User
 */
exports.login = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email and password are required" });

  const usersData = readUsersFile();
  const user = usersData.users.find((user) => user.email === email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: "1h" });
  res.json({ message: "Login successful", token });
};

/**
 * ✅ Forgot Password (Generate Reset Token)
 */
exports.forgotPassword = (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  const usersData = readUsersFile();
  if (!usersData.users.some((user) => user.email === email)) {
    return res.status(400).json({ message: "User not found" });
  }

  const resetToken = jwt.sign({ email }, SECRET_KEY, { expiresIn: "1h" });
  console.log(
    `🔹 Reset Token: http://localhost:4000/reset-password/${resetToken}`
  );

  res.json({ message: "Password reset link has been sent", resetToken });
};

/**
 * ✅ Reset Password (Using Reset Token)
 */
exports.resetPassword = (req, res) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword)
    return res
      .status(400)
      .json({ message: "Token and new password are required" });

  try {
    const { email } = jwt.verify(resetToken, SECRET_KEY);
    const usersData = readUsersFile();
    const user = usersData.users.find((user) => user.email === email);
    if (!user) return res.status(400).json({ message: "User not found" });

    user.password = bcrypt.hashSync(newPassword, 10);
    writeUsersFile(usersData);
    res.json({ message: "Password successfully reset" });
  } catch (error) {
    res.status(400).json({ message: "Invalid or expired reset token" });
  }
};

/**
 * ✅ Add/Edit User Data
 */
exports.addEditData = (req, res) => {
  const { email, data } = req.body;
  if (!email || !data)
    return res.status(400).json({ message: "Email and data are required" });

  const usersData = readUsersFile();
  const user = usersData.users.find((user) => user.email === email);
  if (!user) return res.status(400).json({ message: "User not found" });

  user.data = data; // Update user data
  writeUsersFile(usersData);
  res.json({ message: "Data updated successfully" });
};
