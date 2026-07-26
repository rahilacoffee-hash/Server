const verifyEmailTemplate = (name, otp) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #92400e; margin-bottom: 8px;">ChatVerse</h2>
      <hr style="border-color: #f3f4f6;" />
      <p style="margin-top: 16px;">Hi <strong>${name}</strong>,</p>
      <p>Use the code below to verify your account:</p>
      <div style="background: #fef3c7; padding: 16px; text-align: center; border-radius: 8px; margin: 20px 0;">
        <h1 style="letter-spacing: 12px; color: #92400e; margin: 0;">${otp}</h1>
      </div>
      <p>This code expires in <strong>10 minutes</strong>.</p>
      <p style="color: #9ca3af; font-size: 12px;">If you didn't request this, ignore this email.</p>
    </div>
  `
}

export default verifyEmailTemplate