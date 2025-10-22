import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { summary, description, start, end } = req.body; // dados do agendamento

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground" // pode ser outro redirect
    );

    // 🔑 TOKEN fixo (pegaremos no passo seguinte)
    oauth2Client.setCredentials({
      access_token: process.env.GOOGLE_ACCESS_TOKEN,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    await calendar.events.insert({
      calendarId: "primary", // ou o ID do calendário da clínica
      requestBody: {
        summary,
        description,
        start: { dateTime: start, timeZone: "America/Sao_Paulo" },
        end: { dateTime: end, timeZone: "America/SaoPaulo" },
      },
    });

    res.status(200).json({ message: "Agendamento enviado ao Google Calendar!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Falha ao enviar pro Google Calendar." });
  }
}