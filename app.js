const express = require("express");

const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB ERROR: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// API 1
// Register API
app.post("/register/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;

  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  console.log(dbUser);
  if (dbUser === undefined) {
    // create user in user table
    const createUserQuery = `
        INSERT INTO 
            user(username, name, password, gender, location)
        VALUES 
            (
                '${username}',
                '${name}',
                '${hashedPassword}',
                '${gender}',
                '${location}');`;

    if (password.length < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      await db.run(createUserQuery);
      response.status(200);
      response.send("User created successfully");
    }
  } else {
    //send invalid username as response
    response.status(400);
    response.send("User already exists");
  }
});

// API 2
// User Login API

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    // user doesn't exist
    response.status(400);
    response.send("Invalid user");
  } else {
    //compare password and hashed password.
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);

    if (isPasswordMatched === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// API 3
// Change password
app.put("/change-password/", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  if (dbUser === undefined) {
    // user not registered
    response.status(400);
    response.send("User not registered");
  } else {
    // check passwords is valid or not
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      dbUser.password
    );
    if (isPasswordMatched === true) {
      // check length of newPassword
      const lengthOfNewPassword = newPassword.length;
      if (lengthOfNewPassword < 5) {
        // password is short
        response.status(400);
        response.send("Password is too short");
      } else {
        //update password

        const updatePasswordQuery = `
                    UPDATE user
                    set password = '${hashedPassword}'
                    WHERE  username = '${username}';`;
        await db.run(updatePasswordQuery);
        response.send("Password updated");
      }
    } else {
      // invalid password
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
