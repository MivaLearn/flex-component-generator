// main.js

// --- Imports ---
// Import UI building functions for the form.
import { buildFormUI } from './renderer.js';
// Import preview setup functions, including the function to get the current preview data.
import { setupPreview, getCurrentPreviewData } from './preview.js';

// --- Initialization ---
// Wait for the HTML document to be fully loaded and parsed.
document.addEventListener('DOMContentLoaded', () => {
  // Dynamically build the form structure in the HTML.
  buildFormUI();
  // Set up the live JSON preview pane and get the function to update it.
  // The update function itself isn't explicitly used here after setup,
  // but setupPreview internally attaches the necessary event listeners.
  setupPreview();

  // --- Element References ---
  // Get references to key DOM elements needed for form handling and messaging.
  const form = document.getElementById('component-form');
  const formContent = document.getElementById('form-content'); // Container for accordion items
  const messageDiv = document.getElementById('form-message'); // Div for displaying submission status/errors

  // --- Form Submission Handling ---
  // Ensure the main form element exists before adding the listener.
  if (form) {
    form.addEventListener('submit', async (event) => {
      // Prevent the default browser form submission behavior (which would cause a page reload).
      event.preventDefault();
      // Provide immediate feedback to the user that processing has started.
      messageDiv.textContent = 'Generating...';
      messageDiv.style.color = '#333'; // Default text color

      // 1. Retrieve the latest generated JSON data from the preview module.
      // This data represents the final component definition structure.
      const previewData = getCurrentPreviewData();

      // Basic validation: Check if the preview data exists and is not empty.
      if (!previewData || Object.keys(previewData).length === 0) {
          messageDiv.textContent = 'Error: No preview data generated. Please fill out the form.';
          messageDiv.style.color = 'red'; // Error color
          console.error("Form submitted but preview data is empty or null.");
          return; // Stop the submission process.
      }

      // 2. Send the component definition JSON to the server-side endpoint.
      try {
        // Use the Fetch API to make an asynchronous POST request.
        const response = await fetch('/generate', {
          method: 'POST',
          // Set headers to indicate we're sending JSON data.
          headers: {
            'Content-Type': 'application/json',
          },
          // Convert the JavaScript previewData object into a JSON string for the request body.
          body: JSON.stringify(previewData)
        });

        // Parse the JSON response from the server.
        // Assumes the server *always* sends back JSON, even for errors.
        const result = await response.json();

        // Check if the server indicated success (HTTP status 2xx).
        if (response.ok) {
          console.log('Success:', result); // Log success details to the console.
          // Display a success message from the server or a default one.
          messageDiv.textContent = result.message || 'Component generated successfully!';
          messageDiv.style.color = 'green'; // Success color
          // Potential extension: If the server responds with a download URL,
          // uncomment the line below to trigger the download.
          // if(result.downloadUrl) { window.location.href = result.downloadUrl; }
        } else {
          // Handle server-side errors (HTTP status 4xx, 5xx).
          console.error('Server Error:', result); // Log error details.
          // Display a detailed error message from the server response if available.
          messageDiv.textContent = `Error: ${result.error || 'Unknown server error.'} ${result.details ? '('+result.details+')' : ''}`;
          messageDiv.style.color = 'red'; // Error color
        }
      } catch (error) {
        // Handle network errors (e.g., server unreachable) or errors during fetch/JSON parsing.
        console.error('Network/Fetch Error:', error);
        messageDiv.textContent = 'Error generating component. Check console for details.';
        messageDiv.style.color = 'red'; // Error color
      }
    });
  } else {
      // Log an error if the form element couldn't be found on the page.
      console.error("Component form (#component-form) not found in the DOM.");
  }


  // --- Accordion Logic ---
  // Add event listener to the main form content area to handle accordion clicks efficiently using event delegation.
  if (formContent) {
    formContent.addEventListener('click', (event) => {
      // Find the closest ancestor element that is an accordion header.
      const header = event.target.closest('.accordion-header');
      // If a header was clicked...
      if (header) {
        // Get the parent accordion item element.
        const item = header.parentElement;
        // Check if the parent is indeed an accordion item.
        if (item && item.classList.contains('accordion-item')) {
            // Find the parent container of the clicked item.
            const parentContainer = item.parentElement;
            // Find the main accordion container element (e.g., #accordion).
            const mainAccordionContainer = header.closest('#accordion');

            // Check if this is a top-level accordion item (directly inside #accordion).
            // This prevents nested accordion clicks from closing outer ones.
            if (mainAccordionContainer && parentContainer === mainAccordionContainer) {
                // Find all *other* currently active top-level items within the same main container.
                mainAccordionContainer.querySelectorAll(':scope > .accordion-item.active').forEach(openItem => {
                    // If an open item is not the one just clicked, close it.
                    if (openItem !== item) {
                        openItem.classList.remove('active');
                    }
                });
            }
          // Toggle the 'active' class on the clicked item to open or close it.
          item.classList.toggle('active');
        }
      }
    });
  } else {
      // Log an error if the form content container couldn't be found.
      console.error("Form content container (#form-content) not found in the DOM.");
  }
});
