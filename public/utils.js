// utils.js

// Debounce function to optimize input events
export function debounce(func, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => func.apply(this, args), delay); // Use apply to preserve 'this' context if needed
    };
  }
  
  // Add other general utility functions here if needed in the future
