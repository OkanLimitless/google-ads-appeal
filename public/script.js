document.addEventListener('DOMContentLoaded', function() {
    console.log("script.js is loaded");
    
    // Add a small delay to ensure all elements are rendered
    setTimeout(() => {
        const elements = {
            form: document.getElementById('appeal-form'),
            businessNameInput: document.getElementById('business-name'),
            overviewSection: document.getElementById('modelOverview'),
            detailsSection: document.getElementById('modelDetails'),
            additionalInfoSection: document.getElementById('additionalInfo')
        };

        // Add status container to the DOM
        const statusContainer = document.createElement('div');
        statusContainer.className = 'status-container';
        statusContainer.innerHTML = `
            <div id="statusIndicator" class="status-indicator"></div>
            <span id="statusText">Checking API status...</span>
        `;
        document.body.insertBefore(statusContainer, document.body.firstChild);

        async function checkHealth() {
            const statusIndicator = document.getElementById('statusIndicator');
            const statusText = document.getElementById('statusText');
            
            try {
                statusIndicator.classList.remove('healthy', 'error');
                statusText.textContent = 'Checking API status...';
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                const healthResponse = await fetch('/api/health', {
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                const healthData = await healthResponse.json();
                
                if (!healthResponse.ok || healthData.status !== 'ok') {
                    throw new Error('API is not reachable');
                }

                statusIndicator.classList.add('healthy');
                statusText.textContent = 'API is healthy';
                console.log('API Health:', healthData);
            } catch (error) {
                console.error('API Health Check Failed:', error);
                statusIndicator.classList.add('error');
                statusText.textContent = 'API unavailable';
                statusIndicator.title = error.message;
            }
        }

        // Initial health check
        checkHealth();
        
        // Periodic health check every 30 seconds
        setInterval(checkHealth, 30000);

        elements.form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const businessName = elements.businessNameInput.value.trim();
            if (!businessName) {
                alert('Please enter a business name');
                return;
            }

            try {
                // Show loading state
                const generateBtn = document.querySelector('button[type="submit"]');
                generateBtn.disabled = true;
                generateBtn.textContent = 'Generating...';

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
                console.log('API Response:', data);
                
                // Update output sections with proper formatting
                const formatContent = (content) => {
                    return content
                        .split('\n\n')  // Split into paragraphs
                        .map(p => `<p>${p.trim()}</p>`)  // Wrap each paragraph in <p> tags
                        .join('');  // Join without extra spacing
                };

                elements.overviewSection.innerHTML = formatContent(data.businessModelOverview);
                elements.detailsSection.innerHTML = formatContent(data.businessModelDetails);
                elements.additionalInfoSection.innerHTML = formatContent(data.additionalInfo);
                
                // Show output container with animation
                const outputContainer = document.querySelector('.output-container');
                outputContainer.style.display = 'block';
                outputContainer.style.opacity = 0;
                let opacity = 0;
                const fadeIn = setInterval(() => {
                    opacity += 0.1;
                    outputContainer.style.opacity = opacity;
                    if (opacity >= 1) clearInterval(fadeIn);
                }, 50);
            } catch (error) {
                console.error('Error generating appeal:', error);
                alert(`Failed to generate appeal: ${error.message}`);
            } finally {
                // Reset button state
                const generateBtn = document.querySelector('button[type="submit"]');
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate Appeal';
            }
        });
    }, 100);
});
