require('dotenv').config();
const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const natural = require('natural');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000;

// Încărcare în memorie (evită scrierea pe disk)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Rezumat cu NLP
function generateSummary(text, sentences = 3) {
  const tokenizer = new natural.SentenceTokenizer();
  return tokenizer.tokenize(text).slice(0, sentences).join(' ');
}

// Endpoint procesare PDF
app.post('/api/summarize', upload.single('pdf'), async (req, res) => {
  try {
    const data = await pdf(req.file.buffer);
    const summary = generateSummary(data.text);
    res.json({ summary });
  } catch (error) {
    res.status(500).json({ error: 'Eroare procesare PDF' });
  }
});

app.listen(PORT, () => console.log(`Backend rulând pe portul ${PORT}`));