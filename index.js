
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const pdf = require('pdf-parse');
const app = express();
const port = process.env.PORT || 10000;
const upload = multer();

app.use(cors());
app.use(express.json());

app.post('/pdf/analyze', upload.single('pdf'), async (req, res) => {
  try {
    const dataBuffer = req.file.buffer;
    const pdfData = await pdf(dataBuffer);
    const text = pdfData.text.replace(/\n/g, ' ');

    function extract(pattern, fallback = null) {
      const match = text.match(pattern);
      return match ? match[1].trim() : fallback;
    }

    const teilname = extract(/Benennung\s*[:=]?\s*([\w\- ]+)/i, "k.A.");
    const zeichnung = extract(/Zeichnungsnummer\s*[:=]?\s*(\w+)/i, "k.A.") || extract(/(A\d{6,})/, "k.A.");
    const gewicht = extract(/(?:Gewicht|Masse)\s*[:=]?\s*(\d+[\.,]?\d*)\s?kg/i, "k.A.");
    const material = extract(/Material\s*[:=]?\s*([\w\.\-]+)/i, "k.A.");
    const firma = extract(/(Firma\s*[:=]?\s*[\w\- ]+|Lauten)/i, "k.A.");
    const durchmesser = extract(/Ø\s*(\d+[\.,]?\d*)/, null);
    const laenge = extract(/L(?:=|\s)?(\d+[\.,]?\d*)/, null);
    const masse = (durchmesser && laenge) ? `Ø${durchmesser} × ${laenge} mm` : "nicht sicher erkannt";

    res.json({
      teilname,
      zeichnung,
      material,
      gewicht: gewicht ? gewicht.replace(",", ".") + " kg" : "k.A.",
      masse,
      firma
    });
  } catch (err) {
    console.error("Analysefehler:", err);
    res.status(500).json({ error: 'Fehler bei der Analyse' });
  }
});

app.listen(port, () => {
  console.log("✅ Backend Zeichnungserkennung läuft auf Port " + port);
});
