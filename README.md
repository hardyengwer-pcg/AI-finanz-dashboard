# 📖 Dokumentation: Finanz Dashboard (Google Drive Analyzer)

> [!NOTE]
> **Entwicklungs-Hinweis ("Vibe Coded"):**  
> Dieses Projekt wurde mittels **AI-Pair-Programming ("Vibe Coding")** in Zusammenarbeit zwischen dem menschlichen Product Owner (Ideengeber & Tester) und einer agentischen KI (Code-Generierung, Architektur & Fehlerbehebung) entwickelt. Der Code wurde iterativ auf Basis von direkten Feedbackschleifen und visuellen Design-Vorgaben generiert.

---

## 🚀 Systemübersicht
Das Finanz-Dashboard ist eine moderne React-Anwendung (Vite + TypeScript), die Projekt-Planwerte (aus PDF-Projektanträgen) vollautomatisch mit echten IST-Buchungsdaten (aus Excel-Exporten der Buchhaltungssoftware Sage) in einem Google Drive-Ordner abgleicht.

Zusätzlich bietet es eine Schnittstelle zur Erfassung noch nicht gebuchter, aber bereits beauftragter Bestellungen (offene Aufträge).

---

## 🛠️ Technische Architektur

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Vanilla CSS (Dunkles Finanz-Design exakt nach UI-Screenshots)
- **Charts & Visuelles:** Recharts (für Statusverteilung & Risikobalken)
- **APIs:** 
  - *Google OAuth 2.0 & Identity Services* (Sichere Authentifizierung im Browser)
  - *Google Drive API v3* (Dateilisten-Scanning & Download)
  - *Google Gemini API* (Automatisierte Analyse & Plausibilitätsprüfung)
- **Parser:**
  - *pdf.js* (Clientseitiges Auslesen von PDF-Texten)
  - *SheetJS / xlsx* (Clientseitiges Auslesen von Buchungs- & Auftragstabellen)

---

## ⚙️ Konfiguration & Inbetriebnahme

Die Anwendung benötigt Umgebungsvariablen für die APIs. Lege hierzu im Hauptverzeichnis eine Datei namens `.env` an:

```env
# Google OAuth2 Client ID (aus Google Cloud Console)
VITE_GOOGLE_CLIENT_ID=deine-client-id.apps.googleusercontent.com

# Gemini API Key (aus Google AI Studio: https://aistudio.google.com)
VITE_GEMINI_API_KEY=dein-gemini-api-key

# Google Drive Hauptordner-ID (aus der URL des Drive-Ordners)
VITE_DRIVE_FOLDER_ID=10HGQphnVSNd513excak0W3xuqIyMbXPN

# Live-Polling Intervall in Sekunden (Standard: 5)
VITE_POLL_INTERVAL=5
```

### Setup-Befehle:
1. **Abhängigkeiten installieren:**
   ```bash
   npm install
   ```
2. **Entwicklungs-Server starten:**
   ```bash
   npm run dev
   ```
3. **Produktions-Build erstellen:**
   ```bash
   npm run build
   ```

---

## 🛡️ Sicherheitskonzepte & Datenfluss

1. **Reiner Client-seitiger Datenfluss:**  
   Die Daten verlassen zu keinem Zeitpunkt den Browser des Nutzers in Richtung fremder Server (außer direkt zu Google für den Dokumentendownload und die Gemini-API). Es gibt kein Backend, das deine Daten speichert.
2. **Sicherheits-Credentials (.gitignore):**  
   Die Datei `.env` enthält sensible API-Schlüssel und OAuth-IDs. Sie ist standardmäßig in der `.gitignore` eingetragen, sodass sie niemals in Git-Repositories (z.B. auf GitLab) hochgeladen wird.
3. **Anti-Halluzinations-Logik (KI-Sicherheit):**  
   Der Gemini-Prompt zwingt das Modell, bei fehlenden Daten oder unklaren Buchungstexten Fehlermeldungen in die Liste *"Erkannte Datenunsicherheiten"* zu schreiben, anstatt plausible, aber falsche Werte zu erfinden (Halluzinationen).

---

## 👥 Setup in der Google Cloud (OAuth 2.0)

Damit der Login funktioniert, muss in der Google Cloud Console:
1. Die **Google Drive API** und die **Google Sheets API** aktiviert sein.
2. Unter **OAuth-Zustimmungsbildschirm** (Google Auth Platform > Audience) der Status auf **Testing** stehen.
3. Deine Google-E-Mail-Adresse unter **Test users** (Audience) hinzugefügt sein.
4. Unter **Credentials** (Zugangsdaten) bei deinem Web-Client die Herkunfts-URL (z.B. `http://localhost:5173`) als **Authorized JavaScript Origin** eingetragen sein.
