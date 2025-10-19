// File: server/utils/email.js
import nodemailer from "nodemailer";
import pug from "pug";
import { htmlToText } from "html-to-text";
import path from "path";
import { fileURLToPath } from "url";
import AppError from "./appError.js";
import { logger } from "../middleware/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default class Email {
  constructor(user, url, data = {}) {
    this.to = user.email;
    this.firstName = user.name?.split(" ")[0] || "User";
    this.url = url;
    this.from = `Ayaan from GameShop <${process.env.EMAIL_USERNAME}>`;
    this.data = data;
  }

  newTransport() {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USERNAME, // Your Gmail address
        pass: process.env.EMAIL_PASSWORD, // Your App Password (not Gmail password)
      },
      secure: false,
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  async send(template, subject) {
    try {
      const templatePath = path.join(
        __dirname,
        `../views/email/${template}.pug`
      );

      // Render HTML based on pug template
      const html = pug.renderFile(templatePath, {
        firstName: this.firstName,
        url: this.url,
        subject,
        ...this.data,
      });

      // Define email options
      const mailOptions = {
        from: this.from,
        to: this.to,
        subject,
        html,
        text: htmlToText(html, {
          wordwrap: 130,
          ignoreImage: true,
        }),
        priority: "high",
      };

      // Create transport and send email
      const transport = this.newTransport();
      await transport.sendMail(mailOptions);
      logger.info("Email sent", {
        to: this.to,
        subject,
        template,
      });
    } catch (err) {
      logger.error("Email send failed", {
        message: err.message,
        stack: err.stack,
        to: this.to,
        subject,
        template,
      });
      throw new AppError("Failed to send email", 500, {
        template,
        recipient: this.to,
      });
    }
  }

  async sendWelcome() {
    await this.send("welcome", "Welcome to the GameShop Family!");
  }

  async sendPasswordReset() {
    await this.send(
      "passwordReset",
      "Your password reset token (valid for only 10 minutes)"
    );
  }

  async sendOrderConfirmation(order) {
    await this.send("orderConfirmation", `Your GameShop Order #${order._id}`, {
      order,
    });
  }

  async sendVerificationEmail() {
    await this.send("emailVerification", "Verify your GameShop account email");
  }
}
