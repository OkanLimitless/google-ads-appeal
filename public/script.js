document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('appeal-form');
  const output = document.getElementById('appeal-output');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const businessName = document.getElementById('business-name').value.trim();
    if (!businessName) {
      alert('Please enter a business name');
      return;
    }

    try {
      const response = await fetch('/api/generate-appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate. Status ${response.status}`);
      }
      const data = await response.json();
      output.textContent = data.generatedText;
    } catch (err) {
      console.error('Error generating appeal:', err);
      alert(`Error: ${err.message}`);
    }
  });
});
