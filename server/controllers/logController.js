// File: server/controllers/logController.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";
import AppError from "../utils/appError.js";
import { logger } from "../middleware/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, "../../logs");

// Utility functions
const getFormattedDate = (date = new Date()) => {
  return date.toISOString().split('T')[0];
};

const isValidLogFile = (filename) => {
  return filename.match(/^(application|error|exceptions|rejections)-\d{4}-\d{2}-\d{2}\.log$/);
};

const sanitizeLogEntry = (logEntry) => {
  if (!logEntry || typeof logEntry !== 'object') return logEntry;
  
  // Remove sensitive fields
  const { body, userAgent, ip, password, authorization, cookie, ...sanitizedEntry } = logEntry;
  
  // Mask any potential sensitive data in nested objects
  if (sanitizedEntry.meta && typeof sanitizedEntry.meta === 'object') {
    const { body: metaBody, headers, ...sanitizedMeta } = sanitizedEntry.meta;
    sanitizedEntry.meta = sanitizedMeta;
  }
  
  return sanitizedEntry;
};

const readLogFileStream = async (filePath, options = {}) => {
  const {
    limit = 1000,
    offset = 0,
    level = null,
    userId = null,
    search = null
  } = options;

  return new Promise((resolve, reject) => {
    const logs = [];
    let currentLine = 0;
    let processedCount = 0;

    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    rl.on('line', (line) => {
      currentLine++;
      
      // Skip lines until we reach the offset (for pagination)
      if (currentLine <= offset) return;

      if (line.trim()) {
        try {
          const logEntry = JSON.parse(line);
          
          // Apply filters
          if (level && logEntry.level !== level) return;
          if (userId && logEntry.userId !== userId) return;
          if (search && !JSON.stringify(logEntry).toLowerCase().includes(search.toLowerCase())) return;
          
          // Sanitize before storing
          logs.push(sanitizeLogEntry(logEntry));
          processedCount++;
          
          // Stop if we've reached the limit
          if (processedCount >= limit) {
            rl.close();
          }
        } catch (e) {
          // Skip malformed JSON lines but log the error
          logger.warn('Failed to parse log line', { 
            line: currentLine, 
            error: e.message,
            file: path.basename(filePath)
          });
        }
      }
    });

    rl.on('close', () => {
      resolve(logs.reverse()); // Return latest first
    });

    rl.on('error', (err) => {
      reject(err);
    });

    fileStream.on('error', (err) => {
      reject(err);
    });
  });
};

/**
 * @desc Get all logs with pagination and filtering
 * @route GET /api/v1/admin/logs
 * @access Admin
 */
export const getAllLogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 100,
      level,
      userId,
      search,
      date = getFormattedDate()
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(500, Math.max(1, parseInt(limit))); // Cap at 500 for performance
    const offset = (pageNum - 1) * limitNum;

    // Validate date format
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return next(new AppError("Invalid date format. Use YYYY-MM-DD", 400));
    }

    const logFile = path.join(LOG_DIR, `application-${date}.log`);

    if (!fs.existsSync(logFile)) {
      return next(new AppError(`No logs found for date: ${date}`, 404));
    }

    const logs = await readLogFileStream(logFile, {
      limit: limitNum,
      offset,
      level,
      userId,
      search
    });

    // Get total count for pagination metadata (without reading all lines)
    const totalLines = await new Promise((resolve) => {
      let count = 0;
      const fileStream = fs.createReadStream(logFile);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });

      rl.on('line', () => count++);
      rl.on('close', () => resolve(count));
    });

    res.status(200).json({
      status: "success",
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalLines,
        pages: Math.ceil(totalLines / limitNum)
      },
      filters: {
        level,
        userId,
        search,
        date
      },
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
    const { date = getFormattedDate() } = req.query;
    const logFile = path.join(LOG_DIR, `application-${date}.log`);

    if (!fs.existsSync(logFile)) {
      return next(new AppError(`No logs found for date: ${date}`, 404));
    }

    const logEntry = await new Promise((resolve, reject) => {
      const fileStream = fs.createReadStream(logFile);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });

      let foundEntry = null;

      rl.on('line', (line) => {
        if (line.trim()) {
          try {
            const entry = JSON.parse(line);
            if (entry.requestId === req.params.id) {
              foundEntry = entry;
              rl.close();
            }
          } catch (e) {
            // Skip malformed lines
          }
        }
      });

      rl.on('close', () => {
        resolve(foundEntry);
      });

      rl.on('error', (err) => {
        reject(err);
      });
    });

    if (!logEntry) {
      return next(new AppError(`Log with ID ${req.params.id} not found for date ${date}`, 404));
    }

    res.status(200).json({
      status: "success",
      data: sanitizeLogEntry(logEntry),
    });
  } catch (err) {
    next(new AppError("Error reading logs: " + err.message, 500));
  }
};

/**
 * @desc Get available log dates
 * @route GET /api/v1/admin/logs/dates/available
 * @access Admin
 */
export const getAvailableLogDates = async (req, res, next) => {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      return res.status(200).json({
        status: "success",
        data: [],
      });
    }

    const files = fs.readdirSync(LOG_DIR);
    const logDates = files
      .filter(file => isValidLogFile(file))
      .map(file => file.match(/\d{4}-\d{2}-\d{2}/)?.[0])
      .filter(Boolean)
      .sort()
      .reverse(); // Most recent first

    res.status(200).json({
      status: "success",
      results: logDates.length,
      data: logDates,
    });
  } catch (err) {
    next(new AppError("Error reading log dates: " + err.message, 500));
  }
};

/**
 * @desc Get log statistics
 * @route GET /api/v1/admin/logs/stats
 * @access Admin
 */
export const getLogStats = async (req, res, next) => {
  try {
    const { date = getFormattedDate() } = req.query;
    const logFile = path.join(LOG_DIR, `application-${date}.log`);

    if (!fs.existsSync(logFile)) {
      return next(new AppError(`No logs found for date: ${date}`, 404));
    }

    const stats = await new Promise((resolve, reject) => {
      const statistics = {
        total: 0,
        byLevel: {},
        byRoute: {},
        errorCount: 0,
        averageResponseTime: 0,
        uniqueUsers: new Set()
      };

      let totalResponseTime = 0;
      let responseTimeCount = 0;

      const fileStream = fs.createReadStream(logFile);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });

      rl.on('line', (line) => {
        if (line.trim()) {
          try {
            const entry = JSON.parse(line);
            statistics.total++;
            
            // Count by level
            statistics.byLevel[entry.level] = (statistics.byLevel[entry.level] || 0) + 1;
            
            // Count by route
            if (entry.route) {
              const route = entry.route.split('?')[0]; // Remove query params
              statistics.byRoute[route] = (statistics.byRoute[route] || 0) + 1;
            }
            
            // Error count
            if (entry.level === 'error') {
              statistics.errorCount++;
            }
            
            // Response time stats
            if (entry.responseTime) {
              totalResponseTime += entry.responseTime;
              responseTimeCount++;
            }
            
            // Unique users
            if (entry.userId && entry.userId !== 'anonymous') {
              statistics.uniqueUsers.add(entry.userId);
            }
            
          } catch (e) {
            // Skip malformed lines
          }
        }
      });

      rl.on('close', () => {
        statistics.uniqueUsers = statistics.uniqueUsers.size;
        statistics.averageResponseTime = responseTimeCount > 0 
          ? Math.round(totalResponseTime / responseTimeCount) 
          : 0;
        resolve(statistics);
      });

      rl.on('error', (err) => {
        reject(err);
      });
    });

    res.status(200).json({
      status: "success",
      date,
      data: stats,
    });
  } catch (err) {
    next(new AppError("Error calculating log statistics: " + err.message, 500));
  }
};