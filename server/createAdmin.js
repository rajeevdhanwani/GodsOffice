require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Error: MONGODB_URI is not defined in .env file");
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    try {
      // Check if admin user already exists
      const existingUser = await User.findOne({ username: "admin" });
      if (existingUser) {
        console.log("Admin user already exists: username=admin");
        mongoose.disconnect();
        return;
      }

      const password = await bcrypt.hash("adminpassword", 10);
      await User.create({
        username: "admin",
        password,
        isAdmin: true,
        role: "Admin",
      });
      console.log("Admin user created: username=admin, password=adminpassword");
      mongoose.disconnect();
    } catch (err) {
      console.error("Error creating admin user:", err);
      mongoose.disconnect();
    }
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
