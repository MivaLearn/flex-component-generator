// utils.js

// This file contains general utility functions used across the application.

/**
 * Debounce function: Limits the rate at which a function can fire.
 * Ensures that the function is only called after the user hasn't triggered
 * the event for a specified amount of time. Useful for performance optimization
 * on events that fire rapidly (like 'input' or 'resize').
 *
 * @param {Function} func - The function to debounce.
 * @param {number} delay - The debounce delay in milliseconds.
 * @returns {Function} - A debounced version of the original function.
 */
export function debounce(func, delay) {
    let timer; // Variable to hold the setTimeout timer ID.
    return (...args) => { // Return a new function that wraps the original.
      clearTimeout(timer); // Clear any existing timer.
      // Set a new timer.
      timer = setTimeout(() => {
          // When the timer expires, call the original function with the saved arguments
          // and preserve the original 'this' context using apply.
          func.apply(this, args);
        }, delay);
    };
  }

  // Potential future utility functions can be added here, e.g.:
  // - generateUUID()
  // - sanitizeHTML()
  // - formatCurrency()
