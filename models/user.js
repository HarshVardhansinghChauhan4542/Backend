import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    minlength: [3, "Name must be at least 3 characters long"],
    maxlength: [50, "Name must be less than 50 characters long"],
    trim: true,
    validate: {
      validator: (value) => /^[a-zA-Z\s-]+$/.test(value),
      message: "Name can only contain letters, spaces, and hyphens",
    },
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    validate: {
      validator: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: "Please enter a valid email address",
    },
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters long"],
    select: false, 
  },
  isVerified: {
    type: Boolean,
    default: false,
    required: true,
  },
  otp: {
    type: String,
    select: false,
  },
  otpExpiry: {
    type: Date,
    select: false,
  },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

userSchema.pre("save", async function (next) {
  console.log('=== Pre-save Hook ===');
  console.log('Document isModified(password):', this.isModified('password'));
  
  if (!this.isModified("password")) {
    console.log('Password not modified, skipping hashing');
    return next();
  }
  
  try {
    console.log('Hashing password...');
    console.log('Original password length:', this.password ? this.password.length : 0);
    
    const salt = await bcrypt.genSalt(10);
    console.log('Generated salt');
    
    this.password = await bcrypt.hash(this.password, salt);
    console.log('Password hashed successfully');
    console.log('Hashed password length:', this.password.length);
    console.log('Hashed password prefix:', this.password.substring(0, 10) + '...');
    
    next();
  } catch (error) {
    console.error('Error in pre-save hook:', {
      message: error.message,
      stack: error.stack,
      passwordPresent: !!this.password,
      passwordType: typeof this.password
    });
    next(error);
  }
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  try {
    console.log('=== matchPassword Debug ===');
    console.log('Entered password:', enteredPassword ? '***' : 'undefined');
    console.log('Stored password exists:', !!this.password);
    
    if (!enteredPassword) {
      console.error('No password provided for comparison');
      return false;
    }
    
    if (!this.password) {
      console.error('No hashed password found for user:', this.email);
      return false;
    }
    
    // Log first few characters of stored hash for debugging (don't log the whole thing)
    console.log('Stored hash prefix:', this.password.substring(0, 10) + '...');
    
    const isMatch = await bcrypt.compare(enteredPassword, this.password);
    console.log('Password comparison result:', isMatch);
    
    return isMatch;
  } catch (error) {
    console.error('Error in matchPassword:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    return false;
  }
};

userSchema.methods.isValidOtp = function (otp) {
  return this.otp === otp && this.otpExpiry > Date.now();
};

const User = mongoose.model("User", userSchema);
export default User;
