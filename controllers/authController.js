import User from "../models/user.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import sendEmail from "../utils/sendEmail.js";


const generateToken = (userID) => {
  return jwt.sign({ id: userID }, process.env.JWT_SECRET, { expiresIn: "30d" });
};


const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();


export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    console.log('=== Registration Debug ===');
    console.log('Raw password length:', password.length);

    const otp = generateOtp();
    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 min

    console.log('Creating user with these details:', {
      name,
      email,
      passwordLength: password.length,
      otp,
      otpExpiry: new Date(otpExpiry).toISOString(),
      isVerified: false
    });

    // Let the pre-save hook handle password hashing
    const user = await User.create({
      name,
      email,
      password, // Pass the plain password, let the pre-save hook hash it
      otp,
      otpExpiry,
      isVerified: false
    });

    console.log('User created successfully. User ID:', user._id);
    console.log('User document from DB:', JSON.stringify(user, null, 2));

    const htmlMessage = `
      <div style="background-color: #4a6cf7; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0;">KGPnow</h1>
      </div>
      
      <div style="padding: 30px 20px;">
        <h2 style="color: #333333; margin-top: 0;">Verify Your Email Address</h2>
        <p style="color: #555555; font-size: 16px; line-height: 1.6;">
          Hello ${name},<br><br>
            Thank you for registering with KGPnow. To complete your registration, please verify your email address by entering the following One-Time Password (OTP):
          </p>

            <div style="background-color: #f5f8ff; border-radius: 8px; padding: 15px; margin: 25px 0; text-align: center;">
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4a6cf7;">
                ${otp.match(/\d{1}/g).join(' ')}
              </div>
            </div>

            <p style="color: #555555; font-size: 14px; line-height: 1.6;">
              This OTP is valid for <strong>10 minutes</strong> and can only be used once.<br>
                If you didn't request this, you can safely ignore this email.
            </p>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #888888; font-size: 12px;">
              <p>For security reasons, do not share this OTP with anyone. KGPnow will never ask you for your password or OTP.</p>
            </div>
          </div>

          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #888888;">
            © ${new Date().getFullYear()} KGPnow. All rights reserved.
          </div>
      </div>
    `;

    await sendEmail(email, "KGPnow - Verification OTP", "", htmlMessage);

    res.status(201).json({ message: "Registration successful! Check your email for OTP." });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Error registering user" });
  }
};


export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email }).select('+otp +otpExpiry');
    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.isVerified) return res.status(400).json({ message: "User already verified" });

    if (!user.otp || !user.otpExpiry || user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "OTP expired. Please request a new one." });
    }

    if (user.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "OTP verified successfully! You can now login."
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ message: "Error verifying OTP" });
  }
};


export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('=== Login Attempt ===');
    console.log('Email:', email);
    console.log('Password provided:', password ? '***' : 'undefined');

    if (!email || !password) {
      console.error('Missing email or password');
      return res.status(400).json({ message: "Please provide email and password" });
    }

    console.log('Looking up user in database...');
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      console.error('User not found for email:', email);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    console.log('User found. User details:', {
      _id: user._id,
      email: user.email,
      isVerified: user.isVerified,
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0
    });

    console.log('Starting password comparison...');
    console.log('Input password length:', password.length);
    console.log('Stored password hash length:', user.password.length);
    console.log('Stored password hash prefix:', user.password.substring(0, 10) + '...');

    // Direct bcrypt comparison for debugging
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Direct bcrypt.compare result:', isMatch);

    // Also try the model method for comparison
    const modelMatch = await user.matchPassword(password);
    console.log('Model matchPassword result:', modelMatch);

    if (!isMatch || !modelMatch) {
      console.error('Password does not match for user:', email);
      console.error('Comparison details:', {
        inputPassword: password,
        storedPassword: user.password,
        isMatch,
        modelMatch
      });
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isVerified) {
      console.log('User not verified:', email);
      return res.status(403).json({
        message: "Please verify your email with OTP before logging in"
      });
    }

    console.log('Login successful, generating token...');
    const token = generateToken(user._id);

    const { password: _, ...userWithoutPassword } = user.toObject();

    console.log('=== Login Successful ===');
    console.log('User ID:', user._id);
    console.log('Token generated successfully');

    res.status(200).json({
      ...userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Login error:', {
      message: error.message,
      stack: error.stack,
      requestBody: req.body
    });
    res.status(500).json({
      message: "Error logging in",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email }).select('+otp +otpExpiry');
    if (!user) return res.status(400).json({ message: "User not found" });
    if (user.isVerified) return res.status(400).json({ message: "User already verified" });

    const otp = generateOtp();
    const otpExpiry = Date.now() + 10 * 60 * 1000;

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    const htmlMessage = `
      <div style="background-color: #4a6cf7; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0;">KGPnow</h1>
      </div>

      <div style="padding: 30px 20px;">
        <h2 style="color: #333333; margin-top: 0;">Your New OTP Code</h2>
        <p style="color: #555555; font-size: 16px; line-height: 1.6;">
          Hello ${user.name || "User"},<br><br>
          You requested a new OTP for verifying your account. Please use the following One-Time Password:
        </p>

        <div style="background-color: #f5f8ff; border-radius: 8px; padding: 15px; margin: 25px 0; text-align: center;">
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4a6cf7;">
            ${otp.match(/\d{1}/g).join(' ')}
          </div>
        </div>

        <p style="color: #555555; font-size: 14px; line-height: 1.6;">
          This OTP is valid for <strong>10 minutes</strong> and can only be used once.<br>
          If you didn’t request this, you can safely ignore this email.
        </p>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #888888; font-size: 12px;">
          <p>For security reasons, do not share this OTP with anyone. KGPnow will never ask you for your password or OTP.</p>
        </div>
      </div>

      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #888888;">
        © ${new Date().getFullYear()} KGPnow. All rights reserved.
      </div>
    `;

    await sendEmail(email, "KGPnow Resend OTP", "", htmlMessage);

    res.status(200).json({ message: "New OTP sent to your email." });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({ message: "Error resending OTP" });
  }
};


export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(400).json({ message: "User not found" });

    const otp = generateOtp();
    const otpExpiry = Date.now() + 10 * 60 * 1000;

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    const htmlMessage = `
      <div style="background-color: #4a6cf7; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0;">KGPnow</h1>
      </div>

      <div style="padding: 30px 20px;">
        <h2 style="color: #333333; margin-top: 0;">Password Reset Request</h2>
        <p style="color: #555555; font-size: 16px; line-height: 1.6;">
          Hello ${user.name || "User"},<br><br>
          You requested to reset your password. Please use the following OTP to proceed:
        </p>

        <div style="background-color: #f5f8ff; border-radius: 8px; padding: 15px; margin: 25px 0; text-align: center;">
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4a6cf7;">
            ${otp.match(/\d{1}/g).join(' ')}
          </div>
        </div>

        <p style="color: #555555; font-size: 14px; line-height: 1.6;">
          This OTP is valid for <strong>10 minutes</strong> and can only be used once.<br>
          If you didn’t request this, you can safely ignore this email.
        </p>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #888888; font-size: 12px;">
          <p>For security reasons, do not share this OTP with anyone. KGPnow will never ask you for your password or OTP.</p>
        </div>
      </div>

      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #888888;">
        © ${new Date().getFullYear()} KGPnow. All rights reserved.
      </div>
    `;

    await sendEmail(email, "KGPnow Password Reset OTP", "", htmlMessage);

    res.status(200).json({ message: "Password reset OTP sent to your email." });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Error sending password reset OTP" });
  }
};


export const verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email }).select('+otp +otpExpiry');
    if (!user) return res.status(400).json({ success: false, message: "User not found" });

    if (!user.otp || !user.otpExpiry || user.otpExpiry < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP expired. Please request a new one." });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // Don't clear the OTP yet, we'll clear it after password is reset
    res.status(200).json({
      success: true,
      message: "OTP verified successfully"
    });
  } catch (error) {
    console.error("Verify reset OTP error:", error);
    res.status(500).json({ success: false, message: "Error verifying OTP" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, and new password are required" });
    }

    const user = await User.findOne({ email }).select("+password +otp +otpExpiry");
    if (!user) return res.status(400).json({ message: "User not found" });

    if (!user.isVerified) {
      return res.status(403).json({ message: "Please verify your email first" });
    }

    // Check if OTP exists and is not expired
    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ 
        success: false,
        message: "No OTP found. Please request a new password reset." 
      });
    }

    if (user.otpExpiry < Date.now()) {
      // Clear expired OTP
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();
      
      return res.status(400).json({ 
        success: false,
        message: "OTP has expired. Please request a new one." 
      });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid OTP. Please check and try again." 
      });
    }

    // Use findByIdAndUpdate to ensure the document is properly updated
    // This bypasses any potential issues with the document's state
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          password: hashedPassword,
          otp: undefined,
          otpExpiry: undefined
        }
      },
      { new: true, runValidators: true }
    );
    
    // Clear the user object to ensure we don't use stale data
    user.password = hashedPassword;
    user.otp = undefined;
    user.otpExpiry = undefined;

    const htmlMessage = `
      <div style="background-color: #4a6cf7; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0;">KGPnow</h1>
      </div>

      <div style="padding: 30px 20px;">
        <h2 style="color: #333333; margin-top: 0;">Password Updated Successfully</h2>
        <p style="color: #555555; font-size: 16px; line-height: 1.6;">
          Hello ${user.name || "User"},<br><br>
          Your password has been successfully updated. You can now log in to your account using your new password.
        </p>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #888888; font-size: 12px;">
          <p>If you didn’t make this change, please contact our support immediately.</p>
        </div>
      </div>

      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #888888;">
        © ${new Date().getFullYear()} KGPnow. All rights reserved.
      </div>
    `;

    await sendEmail(email, "KGPnow Password Updated", "", htmlMessage);

    res.status(200).json({ message: "Password reset successful! You can now login." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Error resetting password" });
  }
};
