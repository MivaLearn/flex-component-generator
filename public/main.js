// main.js

import { buildFormUI } from './renderer.js';
import { setupPreview } from './preview.js';

document.addEventListener('DOMContentLoaded', () => {
  buildFormUI();
  setupPreview();

  // Use Event Delegation for Accordion Toggle
  const formContent = document.getElementById('form-content');

  if (formContent) {
    formContent.addEventListener('click', (event) => {
      const header = event.target.closest('.accordion-header');

      if (header) {
        const item = header.parentElement; // The .accordion-item

        if (item && item.classList.contains('accordion-item')) {
          const parentContainer = item.parentElement;

          // --- Logic to close other accordions ---
          // Check if this accordion is directly inside the main #accordion container
          // (Adjust selector if your top-level container ID is different)
          const mainAccordionContainer = header.closest('#accordion');

          if (mainAccordionContainer && parentContainer === mainAccordionContainer) {
            // Find sibling accordion items within the main container that are active
            mainAccordionContainer.querySelectorAll(':scope > .accordion-item.active').forEach(openItem => {
              // Close any open sibling *except* the one just clicked
              if (openItem !== item) {
                openItem.classList.remove('active');
              }
            });
          }
           // --- End close logic ---

          // Now, toggle the clicked item
          item.classList.toggle('active');
        }
      }
    });
  } else {
      console.error("Form content container (#form-content) not found.");
  }
});
