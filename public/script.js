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
      const response = await fetch('/api/generate-appeal.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to generate. Status ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        output.textContent = data.generatedText;
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (err) {
      console.error('Error generating appeal:', err);
      output.textContent = `Error: ${err.message}`;
      output.style.color = 'red';
    }
  });
});
