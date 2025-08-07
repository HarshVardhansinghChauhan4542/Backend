import app from "./app.js";
import http from "http";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    process.exit(1);
});

// MongoDB connection options
const mongooseOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000, // Increased timeout to 10s for Vercel
    socketTimeoutMS: 45000,
};

// MongoDB connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, mongooseOptions);
        console.log('✅ Connected to MongoDB');
        
        // Clear any existing OTP data from previous sessions
        await mongoose.connection.db.collection('users').updateMany(
            { otp: { $exists: true } },
            { $unset: { otp: "", otpExpiry: "" } }
        );
        console.log('🧹 Cleared any stale OTP data');
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        // In serverless, we don't want to crash the process
        // The connection will be retried on the next request
    }
};

// Connect to MongoDB when the server starts
connectDB();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥', err);
    // In serverless, we don't want to crash the process
    // The error will be logged and the request will fail gracefully
});

// For Vercel serverless functions
export default async (req, res) => {
    // Ensure database connection
    if (mongoose.connection.readyState === 0) { // 0 = disconnected
        await connectDB();
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-V, Authorization'
    );

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Let Express handle the request
    return app(req, res);
};

// For local development
if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 3001;
    const server = http.createServer(app);
    
    server.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });

    // Handle unhandled promise rejections for local development
    process.on('unhandledRejection', (err) => {
        console.error('UNHANDLED REJECTION! 💥 Shutting down...');
        console.error(err.name, err.message);
        server.close(() => {
            process.exit(1);
        });
    });

    // Handle SIGTERM for local development
    process.on('SIGTERM', () => {
        console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
        server.close(() => {
            console.log('💥 Process terminated!');
            process.exit(0);
        });
    });
}
