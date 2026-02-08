// Email Service (using nodemailer)
import nodemailer from 'nodemailer'
import { env } from '../../config/env'
import { logger } from '../../utils/logger'

// Create transporter
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
})

// Verify transporter on startup
transporter.verify((error) => {
  if (error) {
    logger.error('SMTP transporter verification failed:', error)
  } else {
    logger.info('SMTP transporter ready')
  }
})

/**
 * Send OTP via email
 */
export async function sendOTPEmail(email: string, code: string, expiresAt: Date): Promise<void> {
  const expiresInMinutes = Math.round((expiresAt.getTime() - Date.now()) / 60000)

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1890ff; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f5f5f5; padding: 30px; }
          .otp-code {
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #1890ff;
            text-align: center;
            padding: 20px;
            background: white;
            border-radius: 8px;
            margin: 20px 0;
          }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Media Center 驗證碼</h1>
          </div>
          <div class="content">
            <p>您好，</p>
            <p>您的 Media Center 登入驗證碼是：</p>
            <div class="otp-code">${code}</div>
            <p><strong>此驗證碼將在 ${expiresInMinutes} 分鐘後失效。</strong></p>
            <p>如果您沒有嘗試登入，請忽略此郵件。</p>
          </div>
          <div class="footer">
            <p>此為系統自動發送的郵件，請勿直接回覆。</p>
          </div>
        </div>
      </body>
    </html>
  `

  try {
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: email,
      subject: `Media Center 登入驗證碼: ${code}`,
      text: `您的 Media Center 登入驗證碼是: ${code}\n此驗證碼將在 ${expiresInMinutes} 分鐘後失效。`,
      html: htmlContent,
    })

    logger.info(`OTP email sent to ${email}`)
  } catch (error) {
    logger.error(`Failed to send OTP email to ${email}:`, error)
    throw new Error('Failed to send email')
  }
}

/**
 * Send welcome email (optional, for future use)
 */
export async function sendWelcomeEmail(email: string, displayName?: string): Promise<void> {
  const name = displayName || email.split('@')[0]

  try {
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: email,
      subject: '歡迎使用 Media Center',
      text: `${name} 您好，\n\n歡迎使用 Media Center！\n\n祝您使用愉快！`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>歡迎使用 Media Center</h2>
          <p>${name} 您好，</p>
          <p>歡迎使用 Media Center！</p>
          <p>祝您使用愉快！</p>
        </div>
      `,
    })

    logger.info(`Welcome email sent to ${email}`)
  } catch (error) {
    logger.error(`Failed to send welcome email to ${email}:`, error)
    // Don't throw error for welcome email
  }
}
