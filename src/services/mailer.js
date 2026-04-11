import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendReleaseEmail(email, repo, latestTag, token) {
  const releaseUrl = `https://github.com/${repo}/releases/tag/${latestTag}`;
  const unsubscribeUrl = `http://127.0.0.1:3000/api/unsubscribe/${token}`

  const mailOptions = {
    from: `"GitHub Notifier" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `New release in ${repo}: ${latestTag}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
        <h2>New Release Available!</h2>
        <p>Good news! The repository <b>${repo}</b> has just been updated to version <b>${latestTag}</b>.</p>
        
        <a href="${releaseUrl}" style="display: inline-block; padding: 10px 20px; margin: 15px 0; color: white; background-color: #2ea44f; text-decoration: none; border-radius: 5px; font-weight: bold;">
          View Release on GitHub
        </a>
        
        <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;">
        <p style="font-size: 12px; color: #999;">
          You are receiving this email because you subscribed to release notifications for ${repo}.<br>
          No longer want these updates? <a href="${unsubscribeUrl}" style="color: #d73a49; text-decoration: none;">Unsubscribe here</a>.
        </p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("email was sent");
  } catch (err) {
    console.error(err.message);
  }
}

async function sendConfirmationEmail(email, token, repo) {
  const confirmationUrl = `http://127.0.0.1:3000/api/confirm/${token}`;

  const mailOptions = {
    from: `"GitHub Notifier" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Action Required: Confirm your subscription to ${repo}`,
    html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
          <h2>Welcome!</h2>
          <p>You requested to subscribe to release notifications for the <b>${repo}</b> repository.</p>
          <p>To start receiving emails about new releases, please confirm your subscription by clicking the button below:</p>
          
          <a href="${confirmationUrl}" style="display: inline-block; padding: 10px 20px; margin: 15px 0; color: white; background-color: #2ea44f; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Confirm Subscription
          </a>
          
          <p style="font-size: 14px; color: #666;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${confirmationUrl}">${confirmationUrl}</a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;">
          <p style="font-size: 12px; color: #999;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Confirmation email was sent");
  } catch (err) {
    console.error(err.message);
  }
}

export { sendReleaseEmail, sendConfirmationEmail };
