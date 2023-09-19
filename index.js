const express = require("express");
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();
const bodyParser = require('body-parser');
const Users = require("./Model/Users.js");
const Subscribers = require("./Model/Subscribers.js");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

app.use(bodyParser.json());
app.use(express.json());
app.use(cors());

const secretKey ='yourkey'
//--------------------------------------------------------------------------------------------------------------------------------------------------------
//register
app.post('/register', async (req, res) => {
  try {

    const { name, email, password } = req.body;
    const existinguser= await Users.findOne({email});
    if (existinguser) {
      return res.status (400).json({message:"User already exist"}); 
    }
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const user = new Users({ name, email, password: hashedPassword });

    // Save the user to the database
    await user.save();

    // Generate a JWT token for authentication
    const token = jwt.sign({ userId: user._id },secretKey, {
      expiresIn: '1h', // Token expiration time
    });

    res.status(201).json({ userId: user._id, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

app.get('/api/users',async (req,res)=>{
  try {
    const users = await Users.find({},'name email');
    res.json(users);
  } catch (error) {
    console.log(error);
    res.status(500).sendStatus('internal server error');
  }
});

//-------------------------------------------------------------------------------------------------------------------



app.post('/userlogin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email && password) {
      // Attempt to find a user with the provided email
      const user = await Users.findOne({ email }).select('email password role'); // Include 'role' field

      if (user) {
        // Compare the provided password with the hashed password in the database
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (passwordMatch) {
          // Passwords match, generate a JWT token
          const token = jwt.sign({ email: user.email, role: user.role }, secretKey, { expiresIn: '1h' });

          // Send the role and token in the response
          res.json({ message: 'Login successful', role: user.role, token });
        } else {
          // Passwords do not match, send an error response
          res.status(401).json({ message: 'Invalid credentials' });
        }
      } else {
        // If no user is found with the provided email, return an error response
        res.status(404).json({ message: 'No user found' });
      }
    } else {
      // If email or password is missing, return a bad request response
      res.status(400).json({ message: 'Email and password are required' });
    }
  } catch (error) {
    // Handle any server errors here
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Forgotpass
//-----------------------------------------------------------------------------------------------------------
app.post("/forgot-password", (req, res) => {
  const { email } = req.body;

  Users.findOne({ email })
    .then((user) => {
      if (!user) {
        return res.json({ Status: 'User not existed' });
      }

      // Generate a JWT token with the user's ID
      const token = jwt.sign({ id: user._id }, secretKey, { expiresIn: '1d' });

      var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'aiplaners@gmail.com',
          pass: 'xoemdumkqgsljlnt',
        },
      });

      var mailOptions = {
        from: 'aiplaner@gmail.com',
        to: email,
        subject: 'Reset Password Link',
        text: `http://127.0.0.1:3000/reset-password/${user._id}/${token}`,
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.error(error);
          return res.json({ Status: 'Email sending failed' });
        } else {
          return res.json({ Status: 'Success' });
        }
      });
    })
    .catch((error) => {
      console.error('MongoDB query error:', error);
      return res.json({ Status: 'An error occurred' });
    });
});


//Resetpassword/
//------------------------------------------------------------------------------------------------------

app.post("/reset-password/:id/:token", async (req, res) => {
  try {
    const { id, token } = req.params;
    const { password } = req.body;

    // Verify the JWT token
    jwt.verify(token, secretKey, async (err) => {
      if (err) {
        return res.status(400).json({ Status: "Invalid token" });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update the user's password in the database
      const updatedUser = await Users.findByIdAndUpdate(id, { password: hashedPassword });

      if (!updatedUser) {
        return res.status(404).json({ Status: "User not found" });
      }

      res.json({ Status: "Success" });
    });
  } catch (error) {
    res.status(400).json({ Status: "Bad Request", error: error.message });
  }
});

//---------------------------------------------------------------------------------------------------------------------------------
//Change password
// Change Password Endpoint
app.post('/changepassword', async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;

    if (email && oldPassword && newPassword) {
      // Attempt to find a user with the provided email
      const user = await Users.findOne({ email }).select('email password');

      if (user) {
        // Compare the provided old password with the hashed password in the database
        const passwordMatch = await bcrypt.compare(oldPassword, user.password);

        if (passwordMatch) {
          // Passwords match, update the user's password
          const hashedNewPassword = await bcrypt.hash(newPassword, 10); // Hash the new password

          // Update the user's password in the database
          await Users.updateOne({ email }, { password: hashedNewPassword });

          res.json({ message: 'Password changed successfully' });
        } else {
          // Old password is incorrect, send an error response
          res.status(401).json({ message: 'Invalid old password' });
        }
      } else {
        // If no user is found with the provided email, return an error response
        res.status(404).json({ message: 'No user found' });
      }
    } else {
      // If any of the required fields are missing, return a bad request response
      res.status(400).json({ message: 'Email, old password, and new password are required' });
    }
  } catch (error) {
    // Handle any server errors here
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});








//  Subcriber-----------------------------------------------------------------------------------------------------------------
// Nodemailer setup

app.post('/sendemail',(req, res) => {
  const { email } = req.body;
  try {
   const transporter = nodemailer.createTransport({
    service:"gmail",
    auth:{
      user:"aiplaners@gmail.com"
    }
   })

    const mailOptions = {
      from: 'aiplaners@gmail.com',
      to: email,
      subject: 'Subscription Confirmation',
      text: 'Thank you for subscribing to our newsletter!',
    };

   transporter.sendMail(mailOptions,(error,info)=>{
    console.log("sending email");
    if (error){
      console.log("Error",error)
    } else{
      console.log('email.send' + info.res)
    }
   });

  } catch (error) {

    res.status(201).json({ status:401, error });
  }
});
//------------------------------------------------------------------------------------------------------------------------------------------//

const mongoURI = 'mongodb://127.0.0.1:27017/react'; // Replace with your MongoDB connection URI

// Connect to MongoDB
mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });

// Define a route to check MongoDB connectivity
app.get('/checkMongoDB', (req, res) => {
  // Check if the mongoose connection is established
  const isConnected = mongoose.connection.readyState === 1; // 1 means connected

  if (isConnected) {
    res.status(200).json({ message: 'MongoDB is connected' });
  } else {
    res.status(500).json({ message: 'MongoDB is not connected' });
  }
});


//--------------------------------------------------------------------------------------------------------------------------------
//dashboard
//showdata

app.get('/users', async (req, res) => {
  try {
    const users = await Users.find({}, 'name email'); // Limit fields returned
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


//create data
app.post('/users', async (req, res) => {
  const { name, email } = req.body;

  try {
    const newuser= new Users({ name, email});
    await newuser.save();
    res.status(201).json({ message: 'Data saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
 
//delete data
app.delete('/users/:id', async (req, res) => {
  const userId = req.params.id;
  
  try {
    // Assuming you have a User model defined using Mongoose
    const deletedUser = await Users.findByIdAndRemove(userId);

    if (!deletedUser) {
      // If the user with the provided ID doesn't exist, send a 404 Not Found response
      return res.status(404).json({ message: 'User not found' });
    }

    // If the user was successfully deleted, send a 204 No Content response
    res.status(204).send();
  } catch (error) {
    // If an error occurred during deletion, send a 500 Internal Server Error response
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
//update
app.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;
    const user = await Users.findByIdAndUpdate(id, { name, email }, { new: true });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Could not update user' });
  }
});
//--------------------------------------------------------------------------------------------------------------//
app.listen(5000,()=>{
    console.log("server started");
});