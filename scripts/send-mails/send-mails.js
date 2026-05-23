const nodemailer = require("nodemailer");
const csv = require("csv-parser");
const fs = require("fs");
require("dotenv").config();

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// ── Einstellungen ──────────────────────────────────────────
const GMAIL_ADRESSE = process.env.GMAIL_ADRESSE;
const APP_PASSWORT = process.env.APP_PASSWORT;
const CSV_DATEI = process.env.CSV_DATEI;
const EMAIL_SPALTE = "E-Mail"; // Spaltenname in der CSV
// ───────────────────────────────────────────────────────────

const betreff = "Kurze Umfrage – Deine Meinung ist gefragt! 🤍";

const textNachricht = `Assalamu Alaikum! 🤍

Wir haben bisher 4 Veranstaltungen organisiert – Alhamdulillah! Damit wir 
unser Angebot für euch weiterentwickeln können, würden wir uns sehr über 
euer kurzes Feedback freuen.

Die Umfrage dauert nur 2 Minuten:
👉 https://forms.gle/cZFWxLcEt5kD2eyP7

Jazakallahu Khairan! 🤍`;

const htmlNachricht = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"></head>
<body style="background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:20px 0">
  <div style="background:#fff;margin:0 auto;padding:40px 28px;max-width:520px;border-radius:8px">

    <p style="font-size:22px;font-weight:bold;color:#1a1a1a;margin:0 0 16px">
      Deine Meinung zählt 🤍
    </p>

    <p style="font-size:15px;line-height:26px;color:#333;margin:0 0 12px">
      Assalamu Alaikum,
    </p>

    <p style="font-size:15px;line-height:26px;color:#333;margin:0 0 12px">
      Alhamdulillah – wir haben bisher <strong>4 Veranstaltungen</strong> 
      gemeinsam erlebt! Damit wir unser Angebot für euch 
      weiterentwickeln können, würden wir uns sehr über dein 
      kurzes Feedback freuen.
    </p>

    <div style="background:#f0f7ff;border-radius:8px;padding:14px 18px;margin:16px 0">
      <p style="font-size:14px;line-height:22px;color:#333;margin:4px 0">
        ⏱️ <strong>Dauer:</strong> ca. 2 Minuten
      </p>
      <p style="font-size:14px;line-height:22px;color:#333;margin:4px 0">
        📋 <strong>Themen:</strong> Feedback, Wünsche & Mitgliedschaft
      </p>
      <p style="font-size:14px;line-height:22px;color:#333;margin:4px 0">
        🔒 <strong>Anonym:</strong> Keine Namensangabe nötig
      </p>
    </div>

    <p style="font-size:15px;line-height:26px;color:#333;margin:0 0 12px">
      Jede Antwort hilft uns, bessere Veranstaltungen für 
      unsere Gemeinschaft zu organisieren.
    </p>

    <a href="https://forms.gle/cZFWxLcEt5kD2eyP7"
       style="background:#2563eb;border-radius:6px;color:#fff;display:inline-block;
              font-size:15px;font-weight:bold;padding:12px 28px;
              text-decoration:none;margin:16px 0">
      Zur Umfrage →
    </a>

    <hr style="border:none;border-top:1px solid #e6ebf1;margin:28px 0 16px">

    <p style="font-size:12px;color:#8898aa;line-height:20px;margin:0">
      Allsport Freunde 2026 e.V. – Gemeinsam sportlich in der Rhein-Main-Region
    </p>

  </div>
</body>
</html>
`;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_ADRESSE,
    pass: APP_PASSWORT,
  },
});

async function sendEmails() {
  const emails = [];
  const bereitsGesendet = new Set();

  // CSV einlesen
  await new Promise((resolve, reject) => {
    fs.createReadStream(CSV_DATEI)
      .pipe(csv({ separator: ";" }))
      .on("data", (row) => {
        const email = row[EMAIL_SPALTE]?.trim().toLowerCase();
        if (email && !bereitsGesendet.has(email)) {
          emails.push(email);
          bereitsGesendet.add(email);
        }
      })
      .on("end", resolve)
      .on("error", reject);
  });

  console.log(`${emails.length} eindeutige E-Mails gefunden.`);
  console.log("Starte Versand...\n");

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    try {
      await transporter.sendMail({
        from: '"Allsport Freunde 2026 e.V." <info@allsport-freunde.com>',
        to: email,
        subject: betreff,
        html: htmlNachricht,
        text: textNachricht,
      });
      console.log(`✓ [${i + 1}/${emails.length}] Gesendet: ${email}`);
    } catch (err) {
      console.error(
        `✗ [${i + 1}/${emails.length}] Fehler bei ${email}: ${err.message}`,
      );
    }

    // 1.5 Sekunden Pause zwischen jeder E-Mail
    if (i < emails.length - 1) {
      await delay(1500);
    }
  }

  console.log("\nFertig!");
}

sendEmails();
