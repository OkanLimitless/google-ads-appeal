import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { businessName } = req.body;
  if (!businessName) {
    return res.status(400).json({ error: 'Business name is required' });
  }

  try {
    const generatedText = `This is your generated appeal for "${businessName}".`;
    return res.status(200).json({ generatedText });
  } catch (err) {
    console.error('Error generating appeal:', err);
    return res.status(500).json({ error: 'Failed to generate appeal' });
  }
}
