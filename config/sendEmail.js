import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

async function sendEmail({ sendTo, subject, text, html }) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: sendTo,
      subject,
      text,
      html
    })
    console.log("Email sent:", info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("Email error:", error)
    return { success: false, error: error.message }
  }
}

export default sendEmail