// File: server/routes/emailTestRoutes.js
import express from 'express';
import Email from '../utils/email.js'; // Ensure correct path
import asyncHandler from 'express-async-handler';

const router = express.Router();

//  Send Welcome Email
router.post('/send-welcome', asyncHandler(async (req, res) => {
  const { email, name } = req.body;

  if (!email || !name) {
    return res.status(400).json({ status: 'fail', message: 'Email and name are required' });
  }

  const user = { email, name };
  const url = `${process.env.CLIENT_URL}/welcome`;

  await new Email(user, url).sendWelcome();

  res.status(200).json({ status: 'success', message: 'Welcome email sent successfully!' });
}));

//  Send Password Reset Email
router.post('/send-password-reset', asyncHandler(async (req, res) => {
  const { email, name, resetToken } = req.body;

  if (!email || !name || !resetToken) {
    return res.status(400).json({ status: 'fail', message: 'Email, name, and reset token are required' });
  }

  const user = { email, name };
  const url = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  await new Email(user, url).sendPasswordReset();

  res.status(200).json({ status: 'success', message: 'Password reset email sent successfully!' });
}));

//  Send Order Confirmation Email
router.post('/send-order-confirmation', asyncHandler(async (req, res) => {
  const { email, name, order } = req.body;

  if (!email || !name || !order || !order._id || !order.totalPrice) {
    return res.status(400).json({ status: 'fail', message: 'Email, name, and order details are required' });
  }

  const user = { email, name };
  const url = `${process.env.CLIENT_URL}/orders/${order._id}`;

  await new Email(user, url, { order }).sendOrderConfirmation(order);

  res.status(200).json({ status: 'success', message: 'Order confirmation email sent successfully!' });
}));

//  Send Email Verification
router.post('/send-verification', asyncHandler(async (req, res) => {
  const { email, name, verificationToken } = req.body;

  if (!email || !name || !verificationToken) {
    return res.status(400).json({ status: 'fail', message: 'Email, name, and verification token are required' });
  }

  const user = { email, name };
  const url = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;

  await new Email(user, url).sendVerificationEmail();

  res.status(200).json({ status: 'success', message: 'Verification email sent successfully!' });
}));

export default router;
