// File: server/models/User.js

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/**
 * Embedded Address Schema
 */
const addressSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      default: "Home",
    },
    fullName: {
      type: String,
      required: [true, "Full name is required"],
    },
    address: {
      type: String,
      required: [true, "Street address is required"],
    },
    city: {
      type: String,
      required: [true, "City is required"],
    },
    state: {
      type: String,
      required: [true, "State is required"],
    },
    postalCode: {
      type: String,
      required: [true, "Postal code is required"],
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      default: "United States",
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

/**
 * Embedded Payment Method Schema
 */
const paymentMethodSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["stripe", "paypal", "cod", "credit_card"],
      required: [true, "Payment method type is required"],
      default: "stripe",
    },
    cardHolderName: {
      type: String,
      trim: true,
    },
    cardNumber: {
      type: String,
      minlength: [12, "Invalid card number"],
      maxlength: [19, "Invalid card number"],
      select: false, // Never expose
    },
    expiryMonth: {
      type: Number,
      min: 1,
      max: 12,
    },
    expiryYear: {
      type: Number,
      validate: {
        validator: (v) => v >= new Date().getFullYear(),
        message: "Expiry year cannot be in the past",
      },
    },
    billingAddress: addressSchema,
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

/**
 * Main User Schema
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: (props) => `${props.value} is not a valid email`,
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    avatar: {
      type: String,
      default: "default.jpg",
    },
    isEmailVerified: {
      type: Boolean,
      default: true,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    passwordChangedAt: Date,
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      select: false,
    },
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    // Embedded schemas (aligned with Order model)
    addresses: [addressSchema],
    paymentMethods: [paymentMethodSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
userSchema.index({ role: 1 });

/* ---------------- Middleware: Hash password before saving ---------------- */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

/* ---------------- Middleware: Exclude inactive users ---------------- */
userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

/* ---------------- Instance Methods ---------------- */

/**
 * Compare candidate password with stored hash
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Check if user changed password after the JWT was issued
 */
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

/**
 * Clean output (remove sensitive info)
 */
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  delete user.emailVerificationToken;
  delete user.emailVerificationExpires;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  delete user.twoFactorSecret;

  // Mask card numbers before output
  if (user.paymentMethods) {
    user.paymentMethods = user.paymentMethods.map((pm) => {
      if (pm.cardNumber) {
        pm.cardNumber = "**** **** **** " + pm.cardNumber.slice(-4);
      }
      return pm;
    });
  }

  return user;
};

const User = mongoose.model("User", userSchema);
export default User;