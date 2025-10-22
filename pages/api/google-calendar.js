import { google } from "googleapis";

export default async function handler(req, res) {
  // só aceita POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { summary, description, start, end } = req.body;

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: process.env.GOOGLE_ACCESS_TOKEN,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const event = {
      summary,
      description,
      start: { dateTime: start, timeZone: "America/Sao_Paulo" },
      end: { dateTime: end, timeZone: "America/Sao_Paulo" },
    };

    await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });

    res.status(200).json({ message: "✅ Evento criado com sucesso!" });
  } catch (error) {
    console.error("Erro ao criar evento:", error);
    res.status(500).json({ error: "❌ Falha ao criar evento no Google Calendar." });
  }
}