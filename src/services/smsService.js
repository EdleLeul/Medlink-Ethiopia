const AfricasTalking = require('africastalking');

const at = AfricasTalking({
  apiKey:   process.env.AT_API_KEY,
  username: process.env.AT_USERNAME,
});

const sms = at.SMS;

async function sendSMS(to, body) {
  try {
    const result = await sms.send({
      to:      [to],
      message: body,
      from:    process.env.AT_SENDER_ID || undefined,
    });
    return result;
  } catch (err) {
    console.error('SMS error:', err);
    throw { status: 502, message: 'SMS delivery failed', code: 'SMS_FAILED' };
  }
}

async function sendAppointmentReminder(phone, patientName, hospitalName, dateTime) {
  const body = `MedLink Reminder:\nHi ${patientName}, your appointment at ${hospitalName} is on ${dateTime}.\nPlease arrive 15 minutes early.`;
  return sendSMS(phone, body);
}

async function sendAccessAlert(phone, providerName, facilityName) {
  const body = `MedLink Alert:\nDr. ${providerName} at ${facilityName} accessed your health records.`;
  return sendSMS(phone, body);
}

module.exports = { sendSMS, sendAppointmentReminder, sendAccessAlert };