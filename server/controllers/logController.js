// File: server/controllers/logController.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import AppError from "../utils/appError.js";
import { logger } from "../middleware/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, "../../logs");

/**
 * @desc Get all logs (from rotated log file)
 * @route GET /api/v1/admin/logs
 * @access Admin
 */
export const getAllLogs = async (req, res, next) => {
  try {
    const logFile = path.join(LOG_DIR, "application-" + new Date().toISOString().split("T")[0] + ".log");

    if (!fs.existsSync(logFile)) {
      return next(new AppError("No logs found for today", 404));
    }

    const logs = fs.readFileSync(logFile, "utf8")
      .trim()
      .split("\n")
      .map(line => JSON.parse(line)) // Each log entry is JSON formatted
      .reverse(); // Show latest first

    res.status(200).json({
      status: "success",
      results: logs.length,
      data: logs,
    });
  } catch (err) {
    next(new AppError("Error reading logs: " + err.message, 500));
  }
};

/**
 * @desc Get a specific log by requestId
 * @route GET /api/v1/admin/logs/:id
 * @access Admin
 */
export const getLogById = async (req, res, next) => {
  try {
    const logFile = path.join(LOG_DIR, "application-" + new Date().toISOString().split("T")[0] + ".log");

    if (!fs.existsSync(logFile)) {
      return next(new AppError("No logs found for today", 404));
    }

    const logs = fs.readFileSync(logFile, "utf8")
      .trim()
      .split("\n")
      .map(line => JSON.parse(line));

    const logEntry = logs.find(l => l.requestId === req.params.id);

    if (!logEntry) {
      return next(new AppError(`Log with ID ${req.params.id} not found`, 404));
    }

    res.status(200).json({
      status: "success",
      data: logEntry,
    });
  } catch (err) {
    next(new AppError("Error reading logs: " + err.message, 500));
  }
};
