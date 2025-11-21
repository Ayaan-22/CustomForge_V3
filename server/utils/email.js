// server/utils/email.js
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

  /**
   * Create a secure transport for sending emails.
   */
  newTransport() {
    const { EMAIL_USERNAME, EMAIL_PASSWORD, EMAIL_HOST, EMAIL_PORT } =
      process.env;

    if (!EMAIL_USERNAME || !EMAIL_PASSWORD) {
      logger.error("Email transport misconfigured: missing credentials", {
        hasUsername: !!EMAIL_USERNAME,
        hasPassword: !!EMAIL_PASSWORD,
      });
      throw AppError.internal(
        "Email service is not configured correctly. Please contact support."
      );
    }

    const host = EMAIL_HOST || "smtp.gmail.com";
    const port = Number(EMAIL_PORT) || 465; // 465 with secure: true

    return nodemailer.createTransport({
      host,
      port,
      secure: true, // Enforce TLS
      auth: {
        user: EMAIL_USERNAME,
        pass: EMAIL_PASSWORD,
      },
      // Do NOT disable TLS verification here
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
