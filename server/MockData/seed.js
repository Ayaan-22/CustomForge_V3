// File: server/utils/seed.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/Product.js";
import { logger } from "../middleware/logger.js";
import connectDB from "../config/db.js";
import products from "./sampleData.js"; // ✅ Ensure sampleData is a JS file or use import assertions if it's JSON

dotenv.config(); // Load environment variables
await connectDB(); // Connect to the database

/**
 * Function to import sample data into the database
 */
const importData = async () => {
  try {
    logger.info("Clearing existing product data...");
    await Product.deleteMany(); // ✅ Clear existing data

    // ✅ Loop through products to calculate `finalPrice`
    const updatedProducts = products.map((product) => ({
      ...product,
      finalPrice: parseFloat(
        (
          product.originalPrice -
          (product.originalPrice * product.discountPercentage) / 100
        ).toFixed(2)
      ),
    }));

    await Product.insertMany(updatedProducts); // ✅ Insert new data
    logger.info("Sample data imported successfully");

    process.exit(); // ✅ Exit process on success
  } catch (error) {
    logger.error("Error importing data", { message: error.message, stack: error.stack });
    process.exit(1); // ❌ Exit with failure
  }
};

// ✅ Run the data import function
importData();
