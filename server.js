// import app from "./app.js";
// import http from "http";
// import mongoose from "mongoose";
// import dotenv from "dotenv";

// dotenv.config();

// // Handle uncaught exceptions
// process.on('uncaughtException', (err) => {
//     console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
//     console.error(err.name, err.message);
//     process.exit(1);
// });

// const server = http.createServer(app);

// // Start server
// const port = process.env.PORT || 3001;
// server.listen(port, () => {
//     console.log(`Server is running on port ${port}`);
// });

// // MongoDB connection options
// const mongooseOptions = {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//     serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
//     socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
// };

// // Connect to MongoDB
// mongoose.connect(process.env.MONGO_URI, mongooseOptions)
//     .then(() => {
//         console.log('✅ Connected to MongoDB');
//         // Clear any existing OTP data from previous sessions
//         return mongoose.connection.db.collection('users').updateMany(
//             { otp: { $exists: true } },
//             { $unset: { otp: "", otpExpiry: "" } }
//         );
//     })
//     .then(() => {
//         console.log('🧹 Cleared any stale OTP data');
//     })
//     .catch((err) => {
//         console.error('❌ MongoDB connection error:', err.message);
//         // Graceful shutdown
//         server.close(() => {
//             console.log('💥 Server closed due to MongoDB connection error');
//             process.exit(1);
//         });
//     });

// // Handle unhandled promise rejections
// process.on('unhandledRejection', (err) => {
//     console.error('UNHANDLED REJECTION! 💥 Shutting down...');
//     console.error(err.name, err.message);
//     server.close(() => {
//         process.exit(1);
//     });
// });

// // Handle SIGTERM for graceful shutdown
// process.on('SIGTERM', () => {
//     console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
//     server.close(() => {
//         console.log('💥 Process terminated!');
//     });
// });



import app from "./app.js";
import http from "http";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const server = http.createServer(app);
const port = process.env.PORT || 3001;

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("Connected to MongoDB"))
.catch((err) => {
  console.error("MongoDB connection error:", err.message);
});
