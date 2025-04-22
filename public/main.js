// main.js

// --- Imports ---
// Import UI building functions for the form.
import {buildFormUI} from "./renderer.js";
// Import preview setup functions, including the function to get the current preview data.
import {setupPreview, getCurrentPreviewData} from "./preview.js";

// --- Validation Helper Functions ---

/**
 * Removes all validation error styles and messages from the form.
 * @param {HTMLFormElement} form - The form element.
 */
function clearValidationErrors(form) {
	form.querySelectorAll(".input-error").forEach((el) => el.classList.remove("input-error"));
	form.querySelectorAll(".error-message").forEach((el) => {
		el.textContent = "";
		el.classList.remove("visible");
	});
	const messageDiv = document.getElementById("form-message");
	if (messageDiv) {
		messageDiv.textContent = "";
		messageDiv.style.color = ""; // Reset color
		messageDiv.style.backgroundColor = "";
		messageDiv.style.border = "";
	}
}

/**
 * Displays an error message for a specific input field.
 * @param {HTMLElement} inputElement - The input/select/textarea element with the error.
 * @param {string} message - The error message to display.
 */
function showError(inputElement, message) {
	inputElement.classList.add("input-error");
	// Find the error message span associated with this input
	// Assumes error span is the next sibling or nested nearby
	const errorSpan = inputElement.closest(".property-field, .field-row, .column-row, .responsive-image-row, .option-row, .dependency-row")?.querySelector(".error-message") || inputElement.parentElement?.nextElementSibling; // Fallback check

	if (errorSpan && errorSpan.classList.contains("error-message")) {
		errorSpan.textContent = message;
		errorSpan.classList.add("visible");
	} else {
		console.warn("Could not find error span for", inputElement); // Debugging
	}
}
/**
 * Displays an error message associated with a container (e.g., list of options/columns).
 * @param {HTMLElement} containerElement - The container element (e.g., .columns-list).
 * @param {string} message - The error message to display.
 */
function showContainerError(containerElement, message) {
	// Find the error span specifically for this container
	const errorSpan = containerElement?.parentElement?.querySelector(".error-message"); // Check parent div
	// || containerElement?.previousElementSibling; // Check previous sibling
	if (errorSpan && errorSpan.classList.contains("error-message")) {
		errorSpan.textContent = message;
		errorSpan.classList.add("visible");
		// Optionally add error class to container border?
		// containerElement.style.border = '1px solid #dc3545';
	} else {
		console.warn("Could not find container error span for", containerElement);
	}
}

/**
 * Validates the entire component form.
 * @param {HTMLFormElement} form - The form element.
 * @returns {boolean} - True if the form is valid, false otherwise.
 */
function validateForm(form) {
	clearValidationErrors(form);
	let isValid = true;

	// --- Validate Component Details ---
	const requiredDetails = ["component_name", "component_code", "version", "resourcegroup_code", "properties"];
	requiredDetails.forEach((name) => {
		const input = form.querySelector(`[name="${name}"]`);
		if (input && !input.value.trim()) {
			isValid = false;
			showError(input, "This field is required.");
		} else if (input) {
			// Pattern checks
			const pattern = input.getAttribute("pattern");
			if (pattern) {
				const regex = new RegExp(`^(?:${pattern})$`); // Ensure pattern matches whole string
				if (!regex.test(input.value)) {
					isValid = false;
					const message = input.title || `Invalid format for ${input.name}.`; // Use title or generic message
					showError(input, message);
				}
			}
		}
	});

	// --- Recursive Property Validation Function ---
	function validatePropertyContainer(containerSelector, pathPrefix) {
		form.querySelectorAll(`${containerSelector} > .property-row`).forEach((propRow, index) => {
			const propPath = `${pathPrefix}[${index}]`;
			const typeSelect = propRow.querySelector(`select[name$="[type]"]`);
			const codeInput = propRow.querySelector(`input[name$="[code]"]`);
			const promptInput = propRow.querySelector(`input[name$="[prompt]"]`);
			const propertyType = typeSelect ? typeSelect.value : null;

			if (!codeInput || !codeInput.value.trim()) {
				isValid = false;
				if (codeInput) showError(codeInput, "Property code is required.");
			} else if (!/^[a-z0-9_]+$/.test(codeInput.value)) {
				isValid = false;
				if (codeInput) showError(codeInput, "Code must be lowercase letters, numbers, underscores.");
			}

			// Prompt required unless it's a group
			if (propertyType !== "group" && (!promptInput || !promptInput.value.trim())) {
				isValid = false;
				if (promptInput) showError(promptInput, "Property prompt is required.");
			}

			// Type-specific required fields
			if (propertyType === "select" || propertyType === "radio" || propertyType === "selector") {
				const optionsContainer = propRow.querySelector(".options-container");
				const optionRows = optionsContainer ? optionsContainer.querySelectorAll(":scope > .option-row") : [];
				if (optionRows.length === 0) {
					isValid = false;
					if (optionsContainer) showContainerError(optionsContainer, "At least one option is required.");
				} else {
					optionRows.forEach((optRow) => {
						const textInput = optRow.querySelector('input[name$="[text]"]');
						const valueInput = optRow.querySelector('input[name$="[value]"]');
						if (textInput && !textInput.value.trim()) {
							isValid = false;
							showError(textInput, "Option text required.");
						}
						if (valueInput && !valueInput.value.trim()) {
							isValid = false;
							showError(valueInput, "Option value required.");
						}
					});
				}
			} else if (propertyType === "customlookup") {
				const lookupContainer = propRow.querySelector(".custom-lookup-container");
				const modCode = lookupContainer?.querySelector('input[name$="[module_code]"]');
				const modFunc = lookupContainer?.querySelector('input[name$="[module_function]"]');
				const selCol = lookupContainer?.querySelector('input[name$="[selection_column]"]');
				const columnsList = lookupContainer?.querySelector(".columns-list");
				const columnRows = columnsList ? columnsList.querySelectorAll(":scope > .column-row") : [];

				if (modCode && !modCode.value.trim()) {
					isValid = false;
					showError(modCode, "Module code required.");
				}
				if (modFunc && !modFunc.value.trim()) {
					isValid = false;
					showError(modFunc, "Module function required.");
				}
				if (selCol && !selCol.value.trim()) {
					isValid = false;
					showError(selCol, "Selection column required.");
				} else if (selCol && !/^[a-z0-9_]+$/.test(selCol.value)) {
					isValid = false;
					showError(selCol, "Invalid format (a-z, 0-9, _).");
				}

				if (columnRows.length === 0) {
					isValid = false;
					if (columnsList) showContainerError(columnsList, "At least one column definition is required.");
				} else {
					let selectionColumnExists = false;
					columnRows.forEach((colRow) => {
						const colCode = colRow.querySelector('input[name$="[code]"]');
						const colHeader = colRow.querySelector('input[name$="[header]"]');
						const colType = colRow.querySelector('select[name$="[type]"]');

						if (colCode && !colCode.value.trim()) {
							isValid = false;
							showError(colCode, "Code required.");
						} else if (colCode && !/^[a-z0-9_]+$/.test(colCode.value)) {
							isValid = false;
							showError(colCode, "Invalid format (a-z, 0-9, _).");
						} else if (colCode && selCol && colCode.value === selCol.value) {
							selectionColumnExists = true;
						}
						if (colHeader && !colHeader.value.trim()) {
							isValid = false;
							showError(colHeader, "Header required.");
						}
						if (colType && !colType.value) {
							isValid = false;
							showError(colType, "Type required.");
						} // Should have default
					});
					// Check if selection column exists among defined columns
					if (selCol && selCol.value.trim() && !selectionColumnExists) {
						isValid = false;
						showError(selCol, `Selection column "${selCol.value}" not found in defined columns.`);
					}
				}
			} else if (propertyType === "image") {
				const respContainer = propRow.querySelector(".responsive-images-list");
				const respRows = respContainer ? respContainer.querySelectorAll(":scope > .responsive-image-row") : [];
				respRows.forEach((respRow) => {
					const respCode = respRow.querySelector('input[name$="[code]"]');
					const respPrompt = respRow.querySelector('input[name$="[prompt]"]');
					if (respCode && !respCode.value.trim()) {
						isValid = false;
						showError(respCode, "Code required.");
					} else if (respCode && !/^[a-z0-9_]+$/.test(respCode.value)) {
						isValid = false;
						showError(respCode, "Invalid format (a-z, 0-9, _).");
					}
					if (respPrompt && !respPrompt.value.trim()) {
						isValid = false;
						showError(respPrompt, "Prompt required.");
					}
				});
			} else if (propertyType === "group" || (propertyType === "list" && propRow.querySelector('select[name$="[list_type]"]')?.value === "group")) {
				// Recursively validate children
				const childContainer = propRow.querySelector(".child-properties-container");
				if (childContainer) {
					const childContainerSelector = `#${propRow.id || propPath.replace(/\[|\]|\./g, "-")}-children .child-properties-container`; // Need reliable selector
					// Hacky selector - ideally elements should have IDs
					// Or pass the childContainer element directly to a modified validation function
					// For simplicity, let's assume we can select it this way, might need refinement
					// validatePropertyContainer(childContainerSelector, `${propPath}.properties`);
					// --- SAFER: Iterate directly over children ---
					childContainer.querySelectorAll(":scope > .property-row").forEach((childPropRow, childIndex) => {
						validateNestedProperty(childPropRow, `${propPath}.properties[${childIndex}]`);
					});
				}
			}

			// Validate Text Settings Fields (if enabled)
			const textSettingsContainer = propRow.querySelector(".textsettings-container");
			const enableCheckbox = textSettingsContainer?.querySelector('input[name$="[enable_textsettings]"]');
			if (enableCheckbox?.checked) {
				const fieldsContainer = textSettingsContainer.querySelector(".fields-container");
				const fieldRows = fieldsContainer ? fieldsContainer.querySelectorAll(":scope > .field-row") : [];
				if (fieldRows.length === 0) {
					// Maybe not an error, but a warning? Or allow empty text settings?
					// showContainerError(fieldsContainer, 'Add at least one field or disable text settings.');
					// isValid = false;
				} else {
					fieldRows.forEach((fieldRow) => {
						const tsCode = fieldRow.querySelector('input[name$="[code]"]');
						const tsPrompt = fieldRow.querySelector('input[name$="[prompt]"]');
						if (tsCode && !tsCode.value.trim()) {
							isValid = false;
							showError(tsCode, "Field code required.");
						} else if (tsCode && !/^[a-z0-9_]+$/.test(tsCode.value)) {
							isValid = false;
							showError(tsCode, "Invalid format.");
						}
						if (tsPrompt && !tsPrompt.value.trim()) {
							isValid = false;
							showError(tsPrompt, "Field prompt required.");
						}
						// Add more checks for options within text settings if needed
					});
				}
			}
		});
	}
	// Helper for recursive validation (avoids complex selectors)
	function validateNestedProperty(propRow, propPath) {
		const typeSelect = propRow.querySelector(`select[name$="[type]"]`);
		const codeInput = propRow.querySelector(`input[name$="[code]"]`);
		const promptInput = propRow.querySelector(`input[name$="[prompt]"]`);
		const propertyType = typeSelect ? typeSelect.value : null;
		if (!codeInput || !codeInput.value.trim()) {
			isValid = false;
			if (codeInput) showError(codeInput, "Property code required.");
		} else if (!/^[a-z0-9_]+$/.test(codeInput.value)) {
			isValid = false;
			if (codeInput) showError(codeInput, "Invalid format.");
		}
		if (propertyType !== "group" && (!promptInput || !promptInput.value.trim())) {
			isValid = false;
			if (promptInput) showError(promptInput, "Property prompt required.");
		}
		// Add relevant type-specific checks from validatePropertyContainer here if needed for nested levels
		if (propertyType === "group" || (propertyType === "list" && propRow.querySelector('select[name$="[list_type]"]')?.value === "group")) {
			const childContainer = propRow.querySelector(".child-properties-container");
			if (childContainer) {
				childContainer.querySelectorAll(":scope > .property-row").forEach((childPropRow, childIndex) => {
					validateNestedProperty(childPropRow, `${propPath}.properties[${childIndex}]`); // Recurse
				});
			}
		}
		// Add text settings validation call if needed for nested
	}

	// --- Validate Standard Properties ---
	validatePropertyContainer("#properties-container", "properties");

	// --- Validate Advanced Properties ---
	validatePropertyContainer("#advanced-properties-container", "advanced_properties");

	// --- Validate Dependencies ---
	const depList = form.querySelector("#dependencies-list");
	if (depList) {
		depList.querySelectorAll(".dependency-row").forEach((depRow, index) => {
			const depCode = depRow.querySelector('input[name$="[code]"]');
			const depVer = depRow.querySelector('input[name$="[version]"]');
			if (depCode && !depCode.value.trim()) {
				isValid = false;
				showError(depCode, "Component code required.");
			} else if (depCode && !/^[a-z0-9\-]+$/.test(depCode.value)) {
				isValid = false;
				showError(depCode, "Invalid format (a-z, 0-9, -).");
			}
			if (depVer && !depVer.value.trim()) {
				isValid = false;
				showError(depVer, "Version required.");
			}
		});
	}

	return isValid;
}

// --- Initialization ---
// Wait for the HTML document to be fully loaded and parsed.
document.addEventListener("DOMContentLoaded", () => {
	// Dynamically build the form structure in the HTML.
	buildFormUI();
	// Set up the live JSON preview pane and get the function to update it.
	// The update function itself isn't explicitly used here after setup,
	// but setupPreview internally attaches the necessary event listeners.
	setupPreview();

	// --- Element References ---
	// Get references to key DOM elements needed for form handling and messaging.
	const form = document.getElementById("component-form");
	const formContent = document.getElementById("form-content"); // Container for accordion items
	const messageDiv = document.getElementById("form-message"); // Div for displaying submission status/errors

	// --- Form Submission Handling ---
	// Ensure the main form element exists before adding the listener.
	if (form) {
		form.addEventListener("submit", async (event) => {
			// Prevent the default browser form submission behavior (which would cause a page reload).
			event.preventDefault();
			// 1. Frontend Validation
			if (!validateForm(form)) {
				console.log("Frontend validation failed.");
				messageDiv.textContent = "Please fix the errors highlighted below.";
				messageDiv.style.color = "red";
				messageDiv.style.backgroundColor = "#f8d7da"; // Bootstrap danger background
				messageDiv.style.border = "1px solid #f5c6cb"; // Bootstrap danger border
				messageDiv.scrollIntoView({behavior: "smooth", block: "start"}); // Scroll to show message
				return; // Stop submission
			}

			// 2. If valid, proceed with submission
			messageDiv.textContent = "Generating...";
			messageDiv.style.color = "#333";
			messageDiv.style.backgroundColor = "#e2e3e5"; // Bootstrap secondary background
			messageDiv.style.border = "1px solid #d6d8db"; // Bootstrap secondary border

			const previewData = getCurrentPreviewData();

			if (!previewData || Object.keys(previewData).length === 0) {
				// This shouldn't happen if validation passes, but keep as fallback
				messageDiv.textContent = "Error: No preview data generated.";
				messageDiv.style.color = "red";
				messageDiv.style.backgroundColor = "#f8d7da";
				messageDiv.style.border = "1px solid #f5c6cb";
				console.error("Form submitted but preview data is empty or null.");
				return;
			}

			// 3. Send data to server
			try {
				const response = await fetch("/generate", {
					method: "POST",
					headers: {"Content-Type": "application/json"},
					body: JSON.stringify(previewData),
				});
				const result = await response.json();

				if (response.ok) {
					console.log("Success:", result);
					messageDiv.textContent = result.message || "Component generated successfully!";
					messageDiv.style.color = "green";
					messageDiv.style.backgroundColor = "#d4edda"; // Bootstrap success background
					messageDiv.style.border = "1px solid #c3e6cb"; // Bootstrap success border
				} else {
					console.error("Server Error:", result);
					// Display server validation errors
					let errorMsg = `Error: ${result.error || "Unknown server error."}`;
					if (result.details && Array.isArray(result.details)) {
						errorMsg += `\n${result.details.join("\n- ")}`; // Format details nicely
						messageDiv.style.whiteSpace = "pre-wrap"; // Allow line breaks
					} else if (result.details) {
						errorMsg += ` (${result.details})`;
					}
					messageDiv.textContent = errorMsg;
					messageDiv.style.color = "red";
					messageDiv.style.backgroundColor = "#f8d7da";
					messageDiv.style.border = "1px solid #f5c6cb";
				}
			} catch (error) {
				console.error("Network/Fetch Error:", error);
				messageDiv.textContent = "Error generating component. Check console for details.";
				messageDiv.style.color = "red";
				messageDiv.style.backgroundColor = "#f8d7da";
				messageDiv.style.border = "1px solid #f5c6cb";
			}
		});
	} else {
		// Log an error if the form element couldn't be found on the page.
		console.error("Component form (#component-form) not found in the DOM.");
	}

	// --- Accordion Logic ---
	// Add event listener to the main form content area to handle accordion clicks efficiently using event delegation.
	if (formContent) {
		formContent.addEventListener("click", (event) => {
			// Find the closest ancestor element that is an accordion header.
			const header = event.target.closest(".accordion-header");
			// If a header was clicked...
			if (header) {
				// Get the parent accordion item element.
				const item = header.parentElement;
				// Check if the parent is indeed an accordion item.
				if (item && item.classList.contains("accordion-item")) {
					// Find the parent container of the clicked item.
					const parentContainer = item.parentElement;
					// Find the main accordion container element (e.g., #accordion).
					const mainAccordionContainer = header.closest("#accordion");

					// Check if this is a top-level accordion item (directly inside #accordion).
					// This prevents nested accordion clicks from closing outer ones.
					if (mainAccordionContainer && parentContainer === mainAccordionContainer) {
						// Find all *other* currently active top-level items within the same main container.
						mainAccordionContainer.querySelectorAll(":scope > .accordion-item.active").forEach((openItem) => {
							// If an open item is not the one just clicked, close it.
							if (openItem !== item) {
								openItem.classList.remove("active");
							}
						});
					}
					// Toggle the 'active' class on the clicked item to open or close it.
					item.classList.toggle("active");
				}
			}
		});
	} else {
		// Log an error if the form content container couldn't be found.
		console.error("Form content container (#form-content) not found in the DOM.");
	}
});
