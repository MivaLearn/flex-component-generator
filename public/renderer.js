// renderer.js

// --- Imports ---
// Import configuration containing property type definitions and helper functions.
import {BASE_TYPE_FIELDS, getFieldsForTextSubType} from "./config.js";
// Import utility functions like debounce.
import {debounce} from "./utils.js";

// --- Rendering Helper Functions ---
// These functions generate specific parts of the UI dynamically based on user selections.

/**
 * Creates and appends a row of input fields for configuring a single column
 * within a 'customlookup' property's modal definition.
 *
 * @param {HTMLElement} columnsListContainer - The `div.columns-list` element to append the new row to.
 * @param {string} lookupPathPrefix - The base `name` attribute prefix for inputs within the lookup object
 *                                    (e.g., "properties[0][lookup]" or "advanced_properties[1][lookup]").
 */
function addColumnRow(columnsListContainer, lookupPathPrefix) {
	// Determine the index for the new column based on existing rows.
	const columnIndex = columnsListContainer.querySelectorAll(":scope > .column-row").length;
	// Construct the base name path for inputs within this specific column row.
	const columnBasePath = `${lookupPathPrefix}[columns][${columnIndex}]`;

	// Create the container div for the column row.
	const columnRow = document.createElement("div");
	columnRow.classList.add("column-row", "field-row"); // Use field-row for consistent styling.

	// Define the available column data types for the dropdown.
	const columnTypes = ["text", "date", "numeric", "currency", "imagepreview", "mappedtextvalues", "checkbox", "datetime", "serverdate", "serverdatetime"];
	const typeOptions = columnTypes.map((t) => `<option value="${t}">${t}</option>`).join("");

	// Set the inner HTML for the column configuration fields.
	columnRow.innerHTML = `
        <div class="property-field" title="Unique identifier for this column within the lookup definition (lowercase, numbers, underscores).">
            <label>Code:</label>
            <div><input type="text" name="${columnBasePath}[code]" required pattern="[a-z0-9_]+"></div>
        </div>
        <div class="property-field" title="Header text displayed for this column in the lookup modal table.">
            <label>Header:</label>
            <div><input type="text" name="${columnBasePath}[header]" required></div>
        </div>
        <div class="property-field" title="Data type used for rendering and sorting the column in the modal.">
            <label>Type:</label>
            <div><select name="${columnBasePath}[type]">${typeOptions}</select></div>
        </div>
        <div class="property-field checkbox-field" title="Allow users to sort the modal data by this column?">
            <label><input type="checkbox" name="${columnBasePath}[sortable]" value="true"> Sortable</label>
        </div>
        <div class="property-field checkbox-field" title="Allow users to filter/search the modal data using this column?">
            <label><input type="checkbox" name="${columnBasePath}[searchable]" value="true"> Searchable</label>
        </div>
        <button type="button" class="remove-column" title="Remove this column definition">Remove Column</button>
    `;

	// Append the new row to the list container.
	columnsListContainer.appendChild(columnRow);

	// Add event listener to the 'Remove Column' button for this specific row.
	columnRow.querySelector(".remove-column").addEventListener("click", () => {
		columnRow.remove();
		// Potential Enhancement: Dispatch an event here if column removal needs
		// to trigger updates elsewhere (e.g., defaults preview).
		// columnsListContainer.dispatchEvent(new CustomEvent('lookup-columns-updated', { bubbles: true }));
	});
}

/**
 * Renders the complete UI section for configuring the 'lookup' object
 * associated with a 'customlookup' property type.
 *
 * @param {HTMLElement} container - The parent element (usually a div within `.property-options`)
 *                                where the lookup configuration UI should be inserted.
 * @param {string} propertyPathPrefix - The base `name` attribute prefix for the property itself
 *                                     (e.g., "properties[0]" or "advanced_properties[1]").
 */
function renderCustomLookupField(container, propertyPathPrefix) {
	// Construct the name prefix for the fields within the 'lookup' object.
	const lookupPathPrefix = `${propertyPathPrefix}[lookup]`;
	// Create a dedicated container for the lookup configuration.
	const lookupContainer = document.createElement("div");
	lookupContainer.classList.add("custom-lookup-container"); // For specific CSS styling.
	lookupContainer.style.marginTop = "15px"; // Add some spacing.

	// Define the HTML structure for the lookup settings fields.
	// Includes module/function, optional title, selection column, sort column, and the columns section.
	lookupContainer.innerHTML = `
        <h4>Custom Lookup Configuration</h4>
        <div class="property-field" title="Miva module code (e.g., 'UTIL') containing the function that provides lookup data.">
            <label>Module Code:</label>
            <div><input type="text" name="${lookupPathPrefix}[module_code]" required></div>
        </div>
        <div class="property-field" title="Function within the specified module to call. This function should return the lookup data in the expected format.">
            <label>Module Function:</label>
            <div><input type="text" name="${lookupPathPrefix}[module_function]" required></div>
        </div>
        <div class="property-field" title="Optional title displayed at the top of the lookup modal window. Defaults to the property's prompt if left empty.">
            <label>Modal Title:</label>
            <div><input type="text" name="${lookupPathPrefix}[title]"></div>
        </div>
        <div class="property-field" title="The 'Code' of the column whose value should be saved when the user makes a selection in the modal. Must match one of the defined column codes below.">
            <label>Selection Column:</label>
            <div><input type="text" name="${lookupPathPrefix}[selection_column]" required pattern="[a-z0-9_]+"></div>
        </div>
        <div class="property-field" title="Optional 'Code' of the column to sort the data by initially when the modal opens.">
            <label>Default Sort Column:</label>
            <div><input type="text" name="${lookupPathPrefix}[default_sort]" pattern="[a-z0-9_]+"></div>
        </div>
        <div class="property-field full-width columns-section" style="margin-top: 20px;">
            <label style="grid-column: 1 / -1; margin-bottom: 10px; font-weight: bold;">Columns:</label>
            <div style="grid-column: 1 / -1;">
                <div class="columns-list"></div>
                <button type="button" class="btn-add-column" style="margin-top: 10px;">Add Column</button>
            </div>
        </div>
    `;
	// Append the lookup configuration UI to the provided container.
	container.appendChild(lookupContainer);

	// Get references to the columns list container and the 'Add Column' button.
	const columnsList = lookupContainer.querySelector(".columns-list");
	const addColumnButton = lookupContainer.querySelector(".btn-add-column");

	// Add event listener to the 'Add Column' button.
	addColumnButton.addEventListener("click", () => {
		// Call the helper function to add a new column configuration row.
		addColumnRow(columnsList, lookupPathPrefix);
	});

	// Add at least one column row initially for convenience.
	addColumnRow(columnsList, lookupPathPrefix);
}

/**
 * Renders the UI for adding text/value pairs, used for properties like 'select', 'radio', 'selector'.
 * Dispatches a custom 'options-updated' event on the container when options are added, removed, or modified.
 *
 * @param {HTMLElement} container - The parent element to append the options UI to.
 * @param {string} propertyPathPrefix - The base `name` path for the property or parent field (e.g., "properties[0]").
 * @param {number|null} [fieldIndex=null] - If rendering within a textsettings field, this is the index of that field. Otherwise null.
 * @param {string|null} [baseName=null] - Optional override for the `name` attribute base path. If null, it's constructed based on context.
 */
function renderOptionsField(container, propertyPathPrefix, fieldIndex = null, baseName = null) {
	// Construct the base name for the options inputs if not provided explicitly.
	// Differentiates between options for a main property vs. options within a textsetting field.
	if (baseName === null) {
		baseName =
			fieldIndex !== null ?
				`${propertyPathPrefix}[fields][${fieldIndex}][options]` // Nested within textsettings field
			:	`${propertyPathPrefix}[options]`; // Direct child of property
	}

	// Create container elements.
	const optionsContainer = document.createElement("div");
	optionsContainer.classList.add("options-container");
	const addOptionButton = document.createElement("button");
	addOptionButton.type = "button";
	addOptionButton.textContent = "Add Option";
	addOptionButton.classList.add("btn-add-option");
	addOptionButton.style.marginTop = "5px";

	// Debounced function to signal that the options structure has changed.
	const dispatchUpdate = debounce(() => {
		// Dispatch a custom event upwards, useful for triggering preview/defaults updates.
		optionsContainer.dispatchEvent(new CustomEvent("options-updated", {bubbles: true, detail: {path: baseName}}));
	}, 100); // Short debounce interval.

	// Event listener for the 'Add Option' button.
	addOptionButton.addEventListener("click", () => {
		// Determine the index for the new option row.
		const optionIndex = optionsContainer.querySelectorAll(":scope > .option-row").length;
		// Create the div for the new option row.
		const optionRow = document.createElement("div");
		optionRow.classList.add("option-row");
		// Set inner HTML with text input, value input, and remove button.
		optionRow.innerHTML = `
            <label>Text: <input type="text" name="${baseName}[${optionIndex}][text]" required></label>
            <label>Value: <input type="text" name="${baseName}[${optionIndex}][value]" required></label>
            <button type="button" class="remove-option">Remove</button>
        `;
		// Insert the new row before the 'Add Option' button.
		optionsContainer.insertBefore(optionRow, addOptionButton);
		// Add listener to the remove button of the newly added row.
		optionRow.querySelector(".remove-option").addEventListener("click", () => {
			optionRow.remove();
			dispatchUpdate(); // Signal update after removal.
		});
		dispatchUpdate(); // Signal update after adding.
	});

	// Append the options container and the add button to the main container.
	container.appendChild(optionsContainer);
	optionsContainer.appendChild(addOptionButton);

	// Use event delegation on the options container to listen for changes in text/value inputs.
	optionsContainer.addEventListener("input", (e) => {
		// Check if the event target is one of the text or value inputs.
		if (e.target.matches('input[name$="[text]"], input[name$="[value]"]')) {
			dispatchUpdate(); // Signal update on input change.
		}
	});
}

/**
 * Renders the specific configuration fields applicable to a given field type
 * *when that field is nested within a textsetting*.
 * For example, if a textsetting field has type 'number', this renders 'min', 'max', 'step'.
 *
 * @param {HTMLElement} container - The `.textsettings-options-container` div where fields should be rendered.
 * @param {string} type - The selected type of the textsetting field (e.g., 'number', 'checkbox', 'text').
 * @param {string} propertyPathPrefix - The base `name` path of the *parent property* owning the textsettings.
 * @param {number} fieldIndex - The index of the current textsetting field within its parent's `fields` array.
 */
function renderTextSettingsOptions(container, type, propertyPathPrefix, fieldIndex) {
	// Clear previous content and set up grid layout.
	container.innerHTML = "";
	container.style.display = "grid";
	container.style.gridTemplateColumns = "minmax(130px, auto) 1fr"; // Label/Input columns.
	container.style.gap = "10px 15px";
	container.style.alignItems = "baseline";

	// Get the field definitions for the selected textsetting field type from the global config.
	// Note: Uses TYPE_FIELDS which has render functions attached (processed later in this file).
	const fields = TYPE_FIELDS[type] || [];

	// Iterate through the applicable fields for this type.
	fields.forEach((fieldConfig) => {
		const fieldName = typeof fieldConfig === "string" ? fieldConfig : fieldConfig.name;

		// --- Skip Fields Not Applicable Here ---
		// - Base fields (code, prompt, type) are handled at the field row level.
		// - Structural/special fields are not relevant inside textsettings options.
		// - Style-related fields are handled directly on the field row.
		if (["code", "prompt", "type", "textsettings", "visibility_conditions", "fields", "style", "style_prefix", "style_suffix"].includes(fieldName)) return;
		// - If the setting type is 'text', only render the 'text_type' dropdown here.
		//   Other text-related fields (placeholder, etc.) are handled by renderTextSubtypeFields.
		if (type === "text" && fieldName !== "text_type") return;

		// --- Prepare Field Rendering ---
		const fieldDef = typeof fieldConfig === "object" ? fieldConfig : {name: fieldName, type: "text"};
		const fieldType = fieldDef.type || "text";
		// Construct the nested name attribute for the input.
		const inputName = `${propertyPathPrefix}[fields][${fieldIndex}][${fieldName}]`;
		let labelText = fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_/g, " ");
		const helpText = fieldDef.helpText || `Configure the ${labelText} for this setting.`;

		// Create elements for grid layout (label + control wrapper).
		const labelElement = document.createElement("label");
		labelElement.textContent = labelText;
		labelElement.title = helpText;
		labelElement.style.gridColumn = "1"; // Place label in the first column.
		const controlWrapper = document.createElement("div");
		controlWrapper.style.gridColumn = "2"; // Place control wrapper in the second column.
		let controlElement = null; // Initialize control element.

		// --- Render Control Based on Type ---
		if (fieldType === "boolean") {
			// Special layout for boolean (checkbox with label).
			labelElement.style.gridColumn = "1 / -1"; // Span both columns.
			labelElement.style.display = "flex";
			labelElement.style.alignItems = "center";
			labelElement.style.fontWeight = "normal"; // Normal weight for checkbox label.
			controlElement = document.createElement("input");
			controlElement.type = "checkbox";
			controlElement.name = inputName;
			controlElement.value = "true"; // Standard value for checked state.
			controlElement.style.width = "auto";
			controlElement.style.marginRight = "8px";
			labelElement.textContent = ""; // Clear existing text.
			labelElement.insertBefore(controlElement, labelElement.firstChild); // Prepend checkbox.
			labelElement.appendChild(document.createTextNode(` ${labelText}`)); // Append text.
			container.appendChild(labelElement); // Append the combined label+checkbox.
			return; // Skip rest of loop for this field.
		} else if (fieldName === "text_type" && fieldType === "dropdown") {
			// Render the 'text_type' dropdown specifically for 'text' setting type.
			const optionsHtml = fieldDef.options.map((option) => `<option value="${option.value}" ${option.value === fieldDef.default ? "selected" : ""}>${option.label}</option>`).join("");
			controlElement = document.createElement("select");
			controlElement.name = inputName;
			controlElement.innerHTML = optionsHtml;
			// Attach listener to handle dynamic rendering of subtype fields.
			attachTextTypeListener(controlElement, propertyPathPrefix, fieldIndex);
		} else if (fieldType === "number" || (type === "text" && ["min", "max", "step", "minlength", "maxlength"].includes(fieldName))) {
			// Handle number inputs and numeric attributes for text inputs.
			controlElement = document.createElement("input");
			controlElement.type = "number";
			controlElement.name = inputName;
			controlElement.placeholder = fieldDef.placeholder || "";
			// Set min/max/step attributes if defined in config.
			if (fieldDef.step) controlElement.step = fieldDef.step;
			if (fieldDef.min !== undefined) controlElement.min = fieldDef.min;
			if (fieldDef.max !== undefined) controlElement.max = fieldDef.max;
		} else if (fieldType === "dropdown" && fieldDef.options) {
			// Render generic dropdowns based on options in config.
			const optionsHtml = fieldDef.options.map((option) => `<option value="${option.value}" ${option.value === fieldDef.default ? "selected" : ""}>${option.label}</option>`).join("");
			controlElement = document.createElement("select");
			controlElement.name = inputName;
			controlElement.innerHTML = optionsHtml;
		} else if (fieldType === "custom" && typeof fieldDef.render === "function") {
			// Handle custom renderers (e.g., the 'options' field for select/radio within textsettings).
			labelElement.style.gridColumn = "1 / -1"; // Label spans full width.
			labelElement.style.marginBottom = "5px";
			controlWrapper.style.gridColumn = "1 / -1"; // Control wrapper also spans.
			// Call the custom render function, passing the wrapper, path prefix, and field index.
			fieldDef.render(controlWrapper, propertyPathPrefix, fieldIndex);
			controlElement = null; // Rendering is handled entirely by the custom function.
		} else {
			// Default to text input.
			controlElement = document.createElement("input");
			controlElement.type = "text";
			controlElement.name = inputName;
			controlElement.placeholder = fieldDef.placeholder || `Enter ${labelText}`;
		}

		// --- Append Elements to Container ---
		// Append the control to its wrapper if one was created.
		if (controlElement) {
			controlWrapper.appendChild(controlElement);
		}
		// Append the label to the main container (grid item).
		container.appendChild(labelElement);
		// Append the control wrapper if it has content or if it was handled by a custom renderer.
		if (controlWrapper.hasChildNodes() || fieldType === "custom") {
			container.appendChild(controlWrapper);
		}
	}); // End forEach fieldConfig

	// --- Post-Rendering Logic ---
	// Trigger initial rendering of text subtype fields if the 'text_type' dropdown exists.
	const textTypeSelect = container.querySelector(`select[name$="[text_type]"]`);
	if (textTypeSelect) {
		// Use setTimeout to ensure the element is fully in the DOM before dispatching event.
		setTimeout(() => {
			if (textTypeSelect.isConnected) textTypeSelect.dispatchEvent(new Event("change"));
		}, 0);
	} else {
		// If the main type is *not* 'text', ensure the subtype options container is hidden.
		// Find the container within the same field row.
		const textSubtypeOptionsContainer = container.closest(".field-row")?.querySelector(".text-subtype-options-container");
		if (textSubtypeOptionsContainer) {
			textSubtypeOptionsContainer.innerHTML = ""; // Clear content.
			textSubtypeOptionsContainer.style.display = "none"; // Hide it.
		}
	}
}

/**
 * Renders the specific input fields based on the selected 'text_type'
 * (e.g., 'placeholder', 'min', 'max' for text_type 'number').
 * Used both for main 'text' properties and 'text' type fields within textsettings.
 *
 * @param {HTMLElement} container - The container div (`.text-subtype-options-container` or `.text-subtype-options-container-main`)
 *                                where the subtype fields should be rendered.
 * @param {string} textSubtype - The selected value from the 'text_type' dropdown (e.g., 'email', 'number').
 * @param {string} propertyPathPrefix - The base `name` path of the property or parent textsetting property.
 * @param {number|null} [fieldIndex=null] - The index if rendering inside a textsetting field, otherwise null.
 */
function renderTextSubtypeFields(container, textSubtype, propertyPathPrefix, fieldIndex = null) {
	// Clear previous content and set up grid layout.
	container.innerHTML = "";
	container.style.display = "grid"; // Use grid even if empty initially.
	container.style.gridTemplateColumns = "minmax(130px, auto) 1fr";
	container.style.gap = "10px 15px";
	container.style.alignItems = "baseline";

	// Get the array of field names relevant to this specific text subtype.
	const subFields = getFieldsForTextSubType(textSubtype);
	// Construct the correct base name path depending on context (main property vs. textsetting field).
	const baseName =
		fieldIndex !== null ?
			`${propertyPathPrefix}[fields][${fieldIndex}]` // Inside textsetting
		:	propertyPathPrefix; // Main property

	// If there are relevant fields for this subtype...
	if (subFields.length > 0) {
		subFields.forEach((fieldName) => {
			// Find the original field definition from BASE_TYPE_FIELDS.text to get details like placeholder.
			const mainTextFields = BASE_TYPE_FIELDS.text || [];
			const fieldDef = mainTextFields.find((f) => typeof f === "object" && f.name === fieldName) || {name: fieldName};

			const labelText = fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_/g, " ");
			const helpText = fieldDef.helpText || `Configure the ${labelText}.`;
			// Construct the full input name using the determined baseName.
			const inputName = `${baseName}[${fieldName}]`;

			// Create label and control wrapper for grid layout.
			const labelElement = document.createElement("label");
			labelElement.textContent = labelText;
			labelElement.style.gridColumn = "1";
			labelElement.title = helpText;
			const controlWrapper = document.createElement("div");
			controlWrapper.style.gridColumn = "2";
			let inputElement;

			// Determine input type (number or text).
			if (["min", "max", "step", "minlength", "maxlength"].includes(fieldName)) {
				inputElement = document.createElement("input");
				inputElement.type = "number";
			} else {
				inputElement = document.createElement("input");
				inputElement.type = "text";
			}
			inputElement.placeholder = fieldDef.placeholder || labelText;
			inputElement.name = inputName;

			// Append elements.
			controlWrapper.appendChild(inputElement);
			container.appendChild(labelElement);
			container.appendChild(controlWrapper);
		});
	} else {
		// If no relevant fields, hide the container.
		container.style.display = "none";
	}
}

/**
 * Attaches the 'change' event listener to a 'text_type' select element.
 * When the selection changes, it calls `renderTextSubtypeFields` to update the UI.
 *
 * @param {HTMLSelectElement} selectElement - The 'text_type' select element.
 * @param {string} propertyPathPrefix - The base `name` path of the property or parent textsetting property.
 * @param {number|null} [fieldIndex=null] - The index if the select element is inside a textsetting field, otherwise null.
 */
function attachTextTypeListener(selectElement, propertyPathPrefix, fieldIndex = null) {
	selectElement.addEventListener("change", (event) => {
		const selectedTextSubtype = event.target.value;
		let targetContainer = null;

		// Determine the correct container to render the subtype fields into.
		if (fieldIndex !== null) {
			// If fieldIndex exists, we are inside a textsetting field row.
			// Find the specific container within that row.
			targetContainer = selectElement.closest(".field-row")?.querySelector(".text-subtype-options-container");
		} else {
			// Otherwise, this is a main property (top-level or nested in a group).
			// Find the main subtype container within the property's accordion body.
			targetContainer = selectElement.closest(".accordion-body")?.querySelector(".property-options .text-subtype-options-container-main");
		}

		// If a target container was found, render the fields.
		if (targetContainer) {
			renderTextSubtypeFields(targetContainer, selectedTextSubtype, propertyPathPrefix, fieldIndex);
		} else {
			// Log an error if the target container couldn't be located (shouldn't happen in normal flow).
			console.error("Could not find target container for text subtype fields.", {propertyPathPrefix, fieldIndex});
		}
	});
}

/**
 * Adds a row for entering a CSS or JS file attribute (name/value pair).
 * Used for attributes like 'media', 'defer', 'async'.
 *
 * @param {HTMLElement} listElement - The `div` element acting as the list container (e.g., `#css-attributes-list`).
 * @param {string} namePrefix - The base `name` attribute for the inputs (e.g., 'css_attribute' or 'js_attribute').
 */
function addAttributeRow(listElement, namePrefix) {
	// Determine the index for the new attribute based on existing children.
	const index = listElement.children.length;
	// Create the container div for the row.
	const attrRow = document.createElement("div");
	// Set inner HTML with name input, value input, and remove button.
	attrRow.innerHTML = `
        <label title="Attribute name (e.g., 'media', 'defer')">Name: <input type="text" name="${namePrefix}_name[${index}]"></label>
        <label title="Attribute value (e.g., 'screen', 'true')">Value: <input type="text" name="${namePrefix}_value[${index}]"></label>
        <button type="button" class="remove-attribute" title="Remove this attribute">Remove</button>`;
	// Append the new row to the list.
	listElement.appendChild(attrRow);
	// Add event listener to the remove button of the new row.
	attrRow.querySelector(".remove-attribute").addEventListener("click", () => attrRow.remove());
}

/**
 * Adds a complete row for configuring a single field within a textsettings block.
 * Includes inputs for code, prompt, type, style, prefix, suffix, and containers for type-specific options.
 *
 * @param {HTMLElement} fieldsContainer - The `div.fields-container` element where the field row should be appended.
 * @param {string} propertyPathPrefix - The base `name` path of the *parent property* owning the textsettings.
 */
function addTextSettingFieldRow(fieldsContainer, propertyPathPrefix) {
	// Determine the index for the new field row.
	const fieldIndex = fieldsContainer.querySelectorAll(":scope > .field-row").length;
	// Create the main container div for the field row.
	const fieldRow = document.createElement("div");
	fieldRow.classList.add("field-row");

	// Define allowed types for fields *within* textsettings (exclude structural/complex types).
	const allowedSubTypes = Object.keys(BASE_TYPE_FIELDS).filter((t) => !["group", "grouplist", "list", "textsettings", "fragment", "customlookup", "image"].includes(t)); // Adjusted exclusion list
	// Construct the base name path for inputs within this field row.
	const baseName = `${propertyPathPrefix}[fields][${fieldIndex}]`;

	// Set the inner HTML for the field configuration inputs.
	fieldRow.innerHTML = `
        <div class="property-field" title="Unique identifier for this setting within the textsettings block (lowercase, numbers, underscores).">
            <label>Code:</label>
            <div><input type="text" name="${baseName}[code]" required pattern="[a-z0-9_]+"></div>
        </div>
        <div class="property-field" title="Label shown for this setting in the Miva admin UI.">
            <label>Prompt:</label>
            <div><input type="text" name="${baseName}[prompt]" required></div>
        </div>
        <div class="property-field" title="Data type of the setting (e.g., text, number, checkbox). Determines the input control shown.">
            <label>Type:</label>
            <div><select name="${baseName}[type]">${allowedSubTypes.map((type) => `<option value="${type}">${type}</option>`).join("")}</select></div>
        </div>
        <div class="property-field" title="Optional CSS property this setting controls (e.g., font-size, color, margin-left). If set, the value entered by the user will be applied to this CSS property.">
            <label>Style Property:</label>
            <div><input type="text" name="${baseName}[style]" placeholder="e.g., font-size"></div>
        </div>
        <div class="property-field style-prefix-field" style="display: none;" title="Optional text to prepend to the user's value before applying the style (e.g., 'calc(').">
            <label>Style Prefix:</label>
            <div><input type="text" name="${baseName}[style_prefix]" placeholder="e.g., calc("></div>
        </div>
        <div class="property-field style-suffix-field" style="display: none;" title="Optional text to append to the user's value before applying the style (e.g., 'px + 1rem)').">
            <label>Style Suffix:</label>
            <div><input type="text" name="${baseName}[style_suffix]" placeholder="e.g., px + 1rem)"></div>
        </div>
        <!-- Container for options specific to the selected 'Type' (e.g., min/max for number) -->
        <div class="textsettings-options-container property-field full-width"></div>
        <!-- Container for options specific to the selected 'text_type' (if Type is 'text') -->
        <div class="text-subtype-options-container property-field full-width" style="display: none;"></div>
        <button type="button" class="remove-field" title="Remove this text setting field">Remove Field</button>
    `;
	// Append the new field row to the container.
	fieldsContainer.appendChild(fieldRow);

	// --- Add Event Listeners for the new row ---
	const typeSelect = fieldRow.querySelector(`select[name$="[type]"]`);
	const optionsContainer = fieldRow.querySelector(".textsettings-options-container");
	const styleInput = fieldRow.querySelector(`input[name$="[style]"]`);
	const prefixFieldWrapper = fieldRow.querySelector(`.style-prefix-field`);
	const suffixFieldWrapper = fieldRow.querySelector(`.style-suffix-field`);

	// Show/hide prefix/suffix fields based on whether a Style Property is entered.
	if (styleInput && prefixFieldWrapper && suffixFieldWrapper) {
		styleInput.addEventListener("input", (event) => {
			const hasValue = event.target.value.trim() !== "";
			prefixFieldWrapper.style.display = hasValue ? "grid" : "none"; // Use grid to match layout
			suffixFieldWrapper.style.display = hasValue ? "grid" : "none";
		});
		styleInput.dispatchEvent(new Event("input")); // Trigger initial check.
	}

	// When the field's 'Type' select changes, render the appropriate options.
	typeSelect.addEventListener("change", () => {
		renderTextSettingsOptions(optionsContainer, typeSelect.value, propertyPathPrefix, fieldIndex);
	});
	// Trigger initial rendering of options based on the default selected type.
	setTimeout(() => {
		if (typeSelect.isConnected) typeSelect.dispatchEvent(new Event("change"));
	}, 0);

	// Add listener for the remove button.
	fieldRow.querySelector(".remove-field").addEventListener("click", () => fieldRow.remove());
}

/**
 * Renders the main container and controls for enabling and managing textsettings
 * fields associated with a parent property (like 'text' or 'textarea').
 *
 * @param {HTMLElement} container - The parent element (usually a div within `.property-options`)
 *                                where the textsettings UI should be inserted.
 * @param {string} propertyPathPrefix - The base `name` path of the *parent property*.
 */
function renderTextSettingsField(container, propertyPathPrefix) {
	// Create the main container for the textsettings section.
	const textSettingsContainer = document.createElement("div");
	textSettingsContainer.classList.add("textsettings-container");

	// Create a wrapper for the enable checkbox and add field button.
	const enableWrapper = document.createElement("div");
	enableWrapper.classList.add("property-field", "checkbox-field"); // Reuse styles
	enableWrapper.style.borderBottom = "none"; // Remove default border

	// Create the 'Enable Text Settings' checkbox.
	const enableTextSettingsCheckbox = document.createElement("input");
	enableTextSettingsCheckbox.type = "checkbox";
	// Generate a unique ID for the checkbox label association.
	const enableId = `enable-textsettings-${propertyPathPrefix}`.replace(/\[|\]/g, "-");
	enableTextSettingsCheckbox.id = enableId;
	// Set the name attribute to capture the enabled state.
	enableTextSettingsCheckbox.name = `${propertyPathPrefix}[enable_textsettings]`;
	enableTextSettingsCheckbox.value = "true"; // Value when checked.

	// Create the label for the checkbox.
	const enableTextSettingsLabel = document.createElement("label");
	enableTextSettingsLabel.htmlFor = enableId;
	enableTextSettingsLabel.appendChild(enableTextSettingsCheckbox); // Place checkbox inside label.
	enableTextSettingsLabel.appendChild(document.createTextNode(" Enable Text Settings"));
	enableTextSettingsLabel.title = "Check this to add configurable style settings (like font size, color) for this property.";

	// Create the 'Add Another Field' button (initially hidden).
	const addFieldButton = document.createElement("button");
	addFieldButton.type = "button";
	addFieldButton.textContent = "Add Another Field";
	addFieldButton.classList.add("btn-add-text-setting"); // Add class for potential styling/selection
	addFieldButton.style.fontSize = "0.9em";
	addFieldButton.style.padding = "5px 10px";
	addFieldButton.style.marginTop = "0";
	addFieldButton.style.display = "none"; // Hidden until enabled.
	addFieldButton.style.marginLeft = "auto"; // Align button to the right.

	// Add checkbox label and button to the wrapper.
	enableWrapper.appendChild(enableTextSettingsLabel);
	enableWrapper.appendChild(addFieldButton);
	// Add the wrapper to the main textsettings container.
	textSettingsContainer.appendChild(enableWrapper);

	// Create the container where individual field rows will be added (initially hidden).
	const fieldsContainer = document.createElement("div");
	fieldsContainer.classList.add("fields-container");
	fieldsContainer.style.display = "none"; // Hidden until enabled.
	textSettingsContainer.appendChild(fieldsContainer);

	// --- Event Listeners ---
	// Handle changes to the 'Enable Text Settings' checkbox.
	enableTextSettingsCheckbox.addEventListener("change", () => {
		const isChecked = enableTextSettingsCheckbox.checked;
		// Show/hide the fields container and the 'Add Field' button.
		fieldsContainer.style.display = isChecked ? "block" : "none";
		addFieldButton.style.display = isChecked ? "inline-block" : "none";

		// If checked and no fields exist yet, add the first field automatically.
		if (isChecked && fieldsContainer.children.length === 0) {
			addTextSettingFieldRow(fieldsContainer, propertyPathPrefix);
		}
		// If unchecked, clear any existing fields to prevent saving unwanted data.
		else if (!isChecked) {
			fieldsContainer.innerHTML = "";
		}
		// Note: Existing fields are preserved if re-enabled.
	});

	// Handle clicks on the 'Add Another Field' button.
	addFieldButton.addEventListener("click", () => {
		addTextSettingFieldRow(fieldsContainer, propertyPathPrefix);
	});

	// Append the entire textsettings UI section to the provided parent container.
	container.appendChild(textSettingsContainer);
}

/**
 * Renders the UI for defining responsive image sizes associated with an 'image' property.
 * Allows specifying code, prompt, width, and height for different image variations.
 * Dispatches a custom 'responsive-images-updated' event when changes occur.
 *
 * @param {HTMLElement} container - The parent element (usually within `.property-options`)
 *                                where the responsive images UI should be inserted.
 * @param {string} propertyPathPrefix - The base `name` path of the parent 'image' property.
 */
function renderResponsiveImagesField(container, propertyPathPrefix) {
	// Create the container for the list of responsive image rows.
	const listContainer = document.createElement("div");
	listContainer.classList.add("responsive-images-list");

	// Create the 'Add' button.
	const addButton = document.createElement("button");
	addButton.type = "button";
	addButton.textContent = "Add Responsive Image Size";
	addButton.classList.add("btn-add-responsive");
	addButton.style.marginTop = "10px";

	// Debounced function to signal updates to the responsive images configuration.
	const dispatchUpdate = debounce(() => {
		listContainer.dispatchEvent(new CustomEvent("responsive-images-updated", {bubbles: true}));
	}, 150);

	// Event listener for the 'Add' button.
	addButton.addEventListener("click", () => {
		// Determine the index for the new row.
		const index = listContainer.querySelectorAll(":scope > .responsive-image-row").length;
		// Construct the base name path for inputs in this row.
		const baseName = `${propertyPathPrefix}[responsive_images][${index}]`;

		// Create the div for the new responsive image row.
		const row = document.createElement("div");
		row.classList.add("responsive-image-row", "field-row"); // Use field-row for layout.

		// Set inner HTML with inputs for code, prompt, width, height, and remove button.
		row.innerHTML = `
            <div class="property-field" title="Unique code for this responsive size (e.g., 'mobile', 'tablet', 'desktop_large'). Used to reference this size in templates.">
                <label>Code:</label>
                <div><input type="text" name="${baseName}[code]" required pattern="[a-z0-9_]+"></div>
            </div>
            <div class="property-field" title="User-friendly label shown in the Page Builder UI when selecting an image for this size.">
                <label>Prompt:</label>
                <div><input type="text" name="${baseName}[prompt]" required></div>
            </div>
            <div class="property-field" title="Optional target width in pixels for this image size. Used for reference or potentially by templates.">
                <label>Width:</label>
                <div><input type="number" name="${baseName}[width]" min="1"></div>
            </div>
            <div class="property-field" title="Optional target height in pixels for this image size. Used for reference or potentially by templates.">
                <label>Height:</label>
                <div><input type="number" name="${baseName}[height]" min="1"></div>
            </div>
            <button type="button" class="remove-responsive-image" title="Remove this responsive size definition">Remove Size</button>
        `;

		// Add listener to the remove button of the newly added row.
		row.querySelector(".remove-responsive-image").addEventListener("click", () => {
			row.remove();
			dispatchUpdate(); // Signal update after removal.
		});
		// Append the new row to the list container.
		listContainer.appendChild(row);
		dispatchUpdate(); // Signal update after adding.
	});

	// Append the list container and add button to the main container.
	container.appendChild(listContainer);
	container.appendChild(addButton);

	// Use event delegation to listen for input changes within the list.
	listContainer.addEventListener("input", (e) => {
		// Check if code or prompt inputs were changed.
		if (e.target.matches('input[name$="[code]"], input[name$="[prompt]"]')) {
			dispatchUpdate(); // Signal update on relevant input changes.
		}
		// Note: Changes to width/height don't necessarily need to trigger a Defaults update,
		// but could if defaults needed width/height info. For now, only code/prompt trigger.
	});
}

// --- Define Render Function Map ---
// Maps the string names used in `BASE_TYPE_FIELDS` to the actual rendering functions defined above.
const renderFunctionMap = {
	renderOptionsField,
	renderTextSettingsField,
	renderResponsiveImagesField,
	renderCustomLookupField,
	// Add other custom render functions here if created.
};

// --- Process TYPE_FIELDS: Assign Render Functions ---
// Create a deep copy of BASE_TYPE_FIELDS to avoid modifying the original config object.
const TYPE_FIELDS = JSON.parse(JSON.stringify(BASE_TYPE_FIELDS));
// Iterate through each property type definition.
for (const typeKey in TYPE_FIELDS) {
	if (Array.isArray(TYPE_FIELDS[typeKey])) {
		// Iterate through the fields defined for the current type.
		TYPE_FIELDS[typeKey].forEach((fieldConfig) => {
			// Check if the field config is an object and has a 'renderFunctionName'.
			if (fieldConfig && typeof fieldConfig === "object" && fieldConfig.hasOwnProperty("renderFunctionName")) {
				const funcName = fieldConfig.renderFunctionName;
				// Look up the function in our map.
				if (typeof renderFunctionMap[funcName] === "function") {
					// Assign the actual function reference to the 'render' property of the field config.
					fieldConfig.render = renderFunctionMap[funcName];
				} else {
					// Warn if a specified render function name doesn't exist in the map.
					console.warn(`Render function "${funcName}" specified in config but not found for field "${fieldConfig.name}" in type "${typeKey}".`);
				}
			}
		});
	}
}
// Now, `TYPE_FIELDS` contains the same structure as `BASE_TYPE_FIELDS` but with
// actual function references attached to `fieldConfig.render` where specified.

/**
 * Adds a complete property row (accordion item) to the UI.
 * Handles rendering the basic fields (type, code, prompt) and dynamically rendering
 * type-specific options using the `TYPE_FIELDS` configuration.
 * Also handles rendering nested properties for 'group' and 'list' types.
 * Dispatches 'property-updated' and 'property-removed' events.
 *
 * @param {HTMLElement} targetContainer - The container element (`#properties-container` or `#advanced-properties-container`)
 *                                        where the new property row should be appended.
 * @param {string} propertyPathPrefix - The base `name` attribute prefix, indicating whether it's a standard ('properties')
 *                                      or advanced ('advanced_properties') property, or nested further.
 */
function addPropertyRow(targetContainer, propertyPathPrefix) {
	// Determine the index based on existing property rows in the target container.
	const currentIndex = targetContainer.querySelectorAll(":scope > .property-row").length;
	// Construct the base name path for this specific property.
	const currentPropertyPath = `${propertyPathPrefix}[${currentIndex}]`;
	// Determine if it's an advanced property based on the path prefix.
	const isAdvanced = propertyPathPrefix.includes("advanced_properties");
	const propertyLabel = isAdvanced ? "Advanced Property" : "Property"; // Label for the header.

	// Create the main accordion item div for the property row.
	const propertyRow = document.createElement("div");
	propertyRow.classList.add("property-row", "accordion-item");

	// Set the basic HTML structure: header, body with core fields, options container, remove button.
	propertyRow.innerHTML = `
        <button class="accordion-header property-header" type="button">${propertyLabel} ${currentIndex}: (Type: text)</button>
        <div class="accordion-body">
            <div class="property-field" title="Select the data type for this property (e.g., Text, Image, Group). This determines the available configuration options and how the data is handled.">
                <label>Type:</label>
                <div><select name="${currentPropertyPath}[type]">${Object.keys(TYPE_FIELDS)
					.map((type) => `<option value="${type}">${type}</option>`)
					.join("")}</select></div>
            </div>
             <div class="property-field" title="Unique identifier for this property (lowercase, numbers, underscores). Used to access the property's value in templates (e.g., component:properties:my_code).">
                 <label>Code:</label>
                 <div><input type="text" name="${currentPropertyPath}[code]" required pattern="[a-z0-9_]+"></div>
             </div>
            <div class="property-field" title="Label displayed for this property in the Miva admin Page Builder interface.">
                <label>Prompt:</label>
                <div><input type="text" name="${currentPropertyPath}[prompt]" required></div>
            </div>
            <!-- Container where type-specific fields will be rendered -->
            <div class="property-options property-field full-width">
                 <!-- Sub-container specifically for text_type related fields (when type is 'text') -->
                 <div class="text-subtype-options-container-main" style="display: none;"></div>
                 <!-- Sub-container specifically for nested child properties (when type is 'group' or 'list') -->
                 <div class="child-properties-container" style="display: none; margin-top: 15px; padding-top: 15px; border-top: 1px dashed #ccc;"></div>
            </div>
            <button type="button" class="remove-property" title="Remove this ${propertyLabel.toLowerCase()}" style="background-color: #dc3545; margin-top: 15px; grid-column: 1 / -1;">Remove</button>
        </div>
    `;
	// Append the new property row to the target container.
	targetContainer.appendChild(propertyRow);
	// Start the new property row expanded.
	propertyRow.classList.add("active");

	// --- Get References to Elements within the new Row ---
	const propertyTypeSelect = propertyRow.querySelector(`select[name$="[type]"]`);
	const propertyOptionsContainer = propertyRow.querySelector(".property-options");
	const propertyHeader = propertyRow.querySelector(".property-header");
	const propertyCodeInput = propertyRow.querySelector(`input[name$="[code]"]`);
	const propertyPromptInput = propertyRow.querySelector(`input[name$="[prompt]"]`);
	const childPropertiesContainer = propertyRow.querySelector(".child-properties-container");

	// --- Header Update Logic ---
	// Function to update the accordion header text based on type and code.
	const updatePropertyHeader = () => {
		const type = propertyTypeSelect.value;
		const code = propertyCodeInput.value.trim();
		propertyHeader.textContent = `${propertyLabel} ${currentIndex}: ${code || "(No Code)"} (Type: ${type})`;
	};
	// Update header when type or code changes.
	propertyTypeSelect.addEventListener("change", updatePropertyHeader);
	propertyCodeInput.addEventListener("input", debounce(updatePropertyHeader, 200)); // Debounce code input
	updatePropertyHeader(); // Initial call to set header text.

	// --- Dynamic Options Rendering on Type Change ---
	propertyTypeSelect.addEventListener("change", () => {
		const selectedType = propertyTypeSelect.value;
		// Get the field definitions for the newly selected type from the processed TYPE_FIELDS.
		const fields = TYPE_FIELDS[selectedType] || [];

		// --- Clear Previous Options ---
		// Remove all previously rendered type-specific options, but keep the static containers.
		Array.from(propertyOptionsContainer.children).forEach((el) => {
			if (!el.classList.contains("text-subtype-options-container-main") && !el.classList.contains("child-properties-container")) {
				el.remove();
			}
		});
		// Clear and hide the specific sub-containers as well.
		const mainSubtypeContainer = propertyOptionsContainer.querySelector(".text-subtype-options-container-main");
		if (mainSubtypeContainer) {
			mainSubtypeContainer.innerHTML = "";
			mainSubtypeContainer.style.display = "none";
		}
		childPropertiesContainer.innerHTML = "";
		childPropertiesContainer.style.display = "none";

		// --- Prepare Fragments for Efficient DOM Insertion ---
		const standardFieldsFragment = document.createDocumentFragment(); // For simple fields (text, number, boolean)
		const textTypeFragment = document.createDocumentFragment(); // Specifically for the text_type dropdown
		const complexFieldsFragment = document.createDocumentFragment(); // For fields needing custom renderers or textareas
		let textTypeSelectElement = null; // Reference to the text_type select if created

		// --- Iterate Through Fields for Selected Type ---
		fields.forEach((fieldConfig) => {
			const fieldName = typeof fieldConfig === "string" ? fieldConfig : fieldConfig.name;
			// Skip core fields already present or handled specially (nested properties).
			if (["code", "prompt", "type", "properties", "group_fields"].includes(fieldName)) return;
			// If the selectedType is 'text', skip rendering fields that are handled by `renderTextSubtypeFields`.
			if (selectedType === "text" && getFieldsForTextSubType("text").includes(fieldName)) return;

			// --- Prepare Field Rendering ---
			const fieldDef = typeof fieldConfig === "object" ? fieldConfig : {name: fieldName, type: "text"};
			const fieldType = fieldDef.type || "text";
			// Construct the input name using the current property's path.
			const inputName = `${currentPropertyPath}[${fieldName}]`;
			let labelText = fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_/g, " ");
			const helpText = fieldDef.helpText || `Configure the ${labelText}.`;

			// Create elements for grid layout.
			const fieldWrapper = document.createElement("div");
			fieldWrapper.classList.add("property-field");
			fieldWrapper.title = helpText;
			const labelElement = document.createElement("label");
			labelElement.textContent = labelText;
			const controlContainer = document.createElement("div");
			let controlElement = null;
			let isComplex = false; // Flag for fields needing full width or custom rendering.

			// --- Render Control Based on Field Type ---
			if (fieldType === "boolean") {
				fieldWrapper.classList.add("checkbox-field"); // Apply specific styling class
				controlElement = document.createElement("input");
				controlElement.type = "checkbox";
				controlElement.name = inputName;
				controlElement.value = "true";
				labelElement.textContent = "";
				labelElement.appendChild(controlElement);
				labelElement.appendChild(document.createTextNode(` ${labelText}`));
			} else if (fieldName === "text_type" && fieldType === "dropdown") {
				// Handle the 'text_type' dropdown specifically.
				const optionsHtml = fieldDef.options.map((option) => `<option value="${option.value}" ${option.value === fieldDef.default ? "selected" : ""}>${option.label}</option>`).join("");
				controlElement = document.createElement("select");
				controlElement.name = inputName;
				controlElement.innerHTML = optionsHtml;
				textTypeSelectElement = controlElement; // Store reference to attach listener later.
			} else if (fieldType === "number") {
				controlElement = document.createElement("input");
				controlElement.type = "number";
				controlElement.name = inputName;
				controlElement.placeholder = fieldDef.placeholder || "";
				if (fieldDef.step !== undefined) controlElement.step = fieldDef.step;
				if (fieldDef.min !== undefined) controlElement.min = fieldDef.min;
				if (fieldDef.max !== undefined) controlElement.max = fieldDef.max;
			} else if (fieldType === "dropdown" && fieldDef.options) {
				// Handle generic dropdowns.
				let optionsHtml = fieldDef.options.map((option) => `<option value="${option.value}" ${option.value === fieldDef.default ? "selected" : ""}>${option.label}</option>`).join("");
				controlElement = document.createElement("select");
				controlElement.name = inputName;
				controlElement.innerHTML = optionsHtml;
			} else if ((fieldType === "custom" || fieldType === "object") && typeof fieldDef.render === "function") {
				// Use the custom render function defined in TYPE_FIELDS.
				fieldWrapper.classList.add("full-width");
				isComplex = true;
				// Call the render function, passing the container and path prefix.
				fieldDef.render(controlContainer, currentPropertyPath);
				controlElement = null; // Rendering handled by the function.
			} else if (fieldType === "textarea") {
				fieldWrapper.classList.add("full-width");
				isComplex = true;
				controlElement = document.createElement("textarea");
				controlElement.name = inputName;
				controlElement.placeholder = fieldDef.placeholder || "";
				controlElement.rows = 3;
			} else {
				// Default to text input.
				controlElement = document.createElement("input");
				controlElement.type = "text";
				controlElement.name = inputName;
				controlElement.placeholder = fieldDef.placeholder || "";
				if (fieldDef.required) controlElement.required = true;
			}

			// --- Assemble Field and Append to Appropriate Fragment ---
			if (fieldType === "boolean") {
				// Boolean checkbox field has integrated label/input.
				fieldWrapper.appendChild(labelElement);
				standardFieldsFragment.appendChild(fieldWrapper);
			} else {
				// For others, assemble label + control container.
				if (controlElement) {
					controlContainer.appendChild(controlElement);
				}
				fieldWrapper.appendChild(labelElement);
				fieldWrapper.appendChild(controlContainer);
				// Append to the correct fragment based on type/complexity.
				if (fieldName === "text_type") {
					textTypeFragment.appendChild(fieldWrapper);
				} else if (isComplex) {
					complexFieldsFragment.appendChild(fieldWrapper);
				} else {
					standardFieldsFragment.appendChild(fieldWrapper);
				}
			}
		}); // End forEach fieldConfig

		// --- Insert Collected Fragments into the DOM ---
		// Find the insertion point (before the subtype container).
		const insertTarget = propertyOptionsContainer.querySelector(".text-subtype-options-container-main");
		// Insert standard fields, then text_type (if any), then complex fields.
		propertyOptionsContainer.insertBefore(standardFieldsFragment, insertTarget);
		if (textTypeFragment.hasChildNodes()) {
			propertyOptionsContainer.insertBefore(textTypeFragment, insertTarget);
			// If text_type select was rendered, attach its listener and trigger initial subtype rendering.
			if (textTypeSelectElement) {
				attachTextTypeListener(textTypeSelectElement, currentPropertyPath, null); // Pass null for fieldIndex (main property).
				setTimeout(() => {
					if (textTypeSelectElement.isConnected) textTypeSelectElement.dispatchEvent(new Event("change"));
				}, 0);
			}
		}
		propertyOptionsContainer.insertBefore(complexFieldsFragment, insertTarget);

		// --- Render "Add Child Property" Button for Group/List Types ---
		if (["group", "list", "grouplist"].includes(selectedType)) {
			childPropertiesContainer.style.display = "block"; // Show the container.
			const addChildButton = document.createElement("button");
			addChildButton.type = "button";
			addChildButton.textContent = "Add Child Property";
			addChildButton.classList.add("btn-add-child-prop"); // Add class for potential styling/selection
			addChildButton.style.marginTop = "10px";

			// Determine the correct key ('properties' or 'group_fields') for nested items based on type.
			const childContainerKey = selectedType === "group" || selectedType === "list" ? "properties" : "group_fields"; // Refined logic: list:group uses 'properties'

			// Construct the path prefix for the child properties, ensuring it maintains the parent's context (standard vs. advanced).
			const childPropertyPathPrefix = `${currentPropertyPath}[${childContainerKey}]`;

			// Add listener to the button to recursively call addPropertyRow for the child.
			addChildButton.addEventListener("click", () => {
				// Add the child row inside the childPropertiesContainer.
				addPropertyRow(childPropertiesContainer, childPropertyPathPrefix);
				// Dispatch event to signal that the parent property structure has changed (affects defaults).
				propertyRow.dispatchEvent(new CustomEvent("property-updated", {bubbles: true}));
			});
			childPropertiesContainer.appendChild(addChildButton);
		}

		// --- Signal Update for Defaults Section ---
		// Dispatch event whenever the type changes, as this affects available default fields.
		propertyRow.dispatchEvent(new CustomEvent("property-updated", {bubbles: true}));
	}); // End propertyTypeSelect change listener

	// --- Event Listeners for Signalling Updates (Affects Defaults) ---
	// Debounce updates triggered by typing in code/prompt inputs.
	propertyCodeInput.addEventListener(
		"input",
		debounce(() => {
			propertyRow.dispatchEvent(new CustomEvent("property-updated", {bubbles: true}));
		}, 300)
	);
	propertyPromptInput.addEventListener(
		"input",
		debounce(() => {
			propertyRow.dispatchEvent(new CustomEvent("property-updated", {bubbles: true}));
		}, 300)
	);
	// Listen for custom events bubbled up from child components (options, responsive images)
	// and re-dispatch as 'property-updated' to simplify listener logic in populateDefaultsSection.
	propertyRow.addEventListener("options-updated", () => {
		propertyRow.dispatchEvent(new CustomEvent("property-updated", {bubbles: true}));
	});
	propertyRow.addEventListener("responsive-images-updated", () => {
		propertyRow.dispatchEvent(new CustomEvent("property-updated", {bubbles: true}));
	});

	// Trigger the 'change' event on the type select initially to render options for the default type ('text').
	propertyTypeSelect.dispatchEvent(new Event("change"));

	// --- Handle Property Removal ---
	propertyRow.querySelector(".remove-property").addEventListener("click", () => {
		const parent = propertyRow.parentElement; // Get the container (#properties-container or #advanced-properties-container)
		propertyRow.remove(); // Remove the entire accordion item.
		// Dispatch event on the parent container to signal removal (affects defaults).
		parent.dispatchEvent(new CustomEvent("property-removed", {bubbles: true}));
	});
}

/**
 * Creates and appends a row for defining a single component dependency.
 *
 * @param {HTMLElement} dependenciesListContainer - The `div#dependencies-list` element to append the row to.
 */
function addDependencyRow(dependenciesListContainer) {
	// Determine the index for the new dependency row.
	const dependencyIndex = dependenciesListContainer.querySelectorAll(":scope > .dependency-row").length;
	// Construct the base name path for inputs within this dependency row's array element.
	// We'll collect as an array and convert to object in preview.js
	const dependencyBasePath = `depends[${dependencyIndex}]`;

	// Create the container div for the dependency row.
	const dependencyRow = document.createElement("div");
	dependencyRow.classList.add("dependency-row"); // Simple class for styling

	// Set the inner HTML for the dependency fields.
	dependencyRow.innerHTML = `
        <div class="property-field" title="Enter the unique 'code' of the component this component depends on (e.g., 'mmx-base', 'my-shared-library').">
            <label>Component Code:</label>
            <div><input type="text" name="${dependencyBasePath}[code]" required pattern="[a-z0-9\\-]+"></div>
        </div>
        <div class="property-field" title="Enter the required version string. Examples: '1.0.0' (exact), '>=10.7.0' (greater or equal). See Miva docs for full syntax.">
            <label>Required Version:</label>
            <div><input type="text" name="${dependencyBasePath}[version]" required placeholder="e.g., >=1.0.0"></div>
        </div>
        <button type="button" class="remove-dependency" title="Remove this dependency">Remove Dependency</button>
    `;

	// Append the new row to the list container.
	dependenciesListContainer.appendChild(dependencyRow);

	// Add event listener to the 'Remove Dependency' button for this specific row.
	dependencyRow.querySelector(".remove-dependency").addEventListener("click", () => {
		dependencyRow.remove();
		// Optional: Dispatch event if needed, though preview handles this.
		// dependenciesListContainer.dispatchEvent(new CustomEvent('dependencies-updated', { bubbles: true }));
	});
}

// --- Main UI Building Function ---

/**
 * Builds the initial static structure of the form, including accordion sections
 * for Component Details, Properties, Advanced Properties, and Defaults.
 * Sets up initial event listeners for static elements.
 */
export function buildFormUI() {
	const formContainer = document.getElementById("form-content");
	if (!formContainer) {
		console.error("Form content container (#form-content) not found. Cannot build UI.");
		return;
	}

	// Define the main accordion structure.
	formContainer.innerHTML = `
    <div id="accordion">
      <!-- Component Details Section -->
      <div class="accordion-item active">
        <button class="accordion-header" type="button">Component Details</button>
        <div class="accordion-body">
          <div class="property-field" title="User-friendly name displayed in the Page Builder component list.">
              <label>Component Name:</label>
              <div><input type="text" name="component_name" value="My Component" required></div>
          </div>
          <div class="property-field" title="Unique machine-readable code for the component (lowercase letters, numbers, hyphens only). Used for filenames and internal references.">
              <label>Component Code:</label>
              <div><input type="text" name="component_code" value="my-component" required pattern="[a-z0-9\\-]+"></div>
          </div>
          <div class="property-field" title="Version number for the component (e.g., 1.0.0). Follows semantic versioning.">
              <label>Version:</label>
              <div><input type="text" name="version" value="1.0.0" required pattern="\\d+\\.\\d+\\.\\d+"></div>
          </div>
          <div class="property-field" title="Type of the component (usually 'component', 'library' is less common). Affects how it's treated by Miva.">
              <label>Component Type:</label>
              <div><select name="type"><option value="component" selected>Component</option><option value="library">Library</option></select></div>
          </div>
          <div class="property-field" title="Optional category for organizing components in the Page Builder interface.">
              <label>Category:</label>
              <div><select name="category"><option value="">-- Select Category --</option><option value="banner">Banner</option><option value="carousel">Carousel</option><option value="text">Text</option><option value="product">Product</option><option value="image">Image</option><option value="video">Video</option><option value="feature">Feature</option><option value="utility">Utility</option><option value="layout">Layout</option><option value="navigation">Navigation</option><option value="form">Form</option><option value="social">Social</option><option value="other">Other</option></select></div>
          </div>
          <div class="property-field" title="Code for the Global Resource Group this component's CSS/JS files belong to. Often matches the Component Code, but can be shared.">
              <label>Global Resource Code:</label>
              <div><input type="text" name="resourcegroup_code" value="my-component" required></div>
          </div>
          <!-- CSS Inclusion -->
          <div class="property-field full-width checkbox-field" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;" title="Check to include a CSS file with this component.">
              <label><input type="checkbox" name="include_css" value="true" checked> Include CSS (<span class="filename-preview css-filename">my-component.css</span>)</label>
          </div>
          <div id="css-attributes-container" style="display: block;" class="property-field full-width attributes-section" title="Define attributes for the CSS <link> tag (e.g., media='screen').">
              <h4>CSS Link Attributes</h4>
              <div id="css-attributes-list"></div>
              <button type="button" id="add-css-attribute">Add CSS Attribute</button>
          </div>
          <!-- JS Inclusion -->
          <div class="property-field full-width checkbox-field" title="Check to include a JavaScript file with this component.">
              <label><input type="checkbox" name="include_js" value="true" checked> Include JS (<span class="filename-preview js-filename">my-component.js</span>)</label>
          </div>
          <div id="js-attributes-container" style="display: block;" class="property-field full-width attributes-section" title="Define attributes for the JS <script> tag (e.g., defer, async).">
              <h4>JS Script Attributes</h4>
              <div id="js-attributes-list"></div>
              <button type="button" id="add-js-attribute">Add JS Attribute</button>
          </div>
        </div>
      </div>
      <!-- Properties Section -->
      <div class="accordion-item">
        <button class="accordion-header" type="button">Properties</button>
        <div class="accordion-body" id="properties-accordion-body">
           <!-- Container where standard property rows will be added dynamically -->
           <div id="properties-container"></div>
           <button id="add-property" type="button" style="margin-top: 15px;">Add Property</button>
        </div>
      </div>
      <!-- Advanced Properties Section -->
      <div class="accordion-item">
         <button class="accordion-header" type="button">Advanced Properties</button>
         <div class="accordion-body" id="advanced-properties-accordion-body">
           <!-- Container where advanced property rows will be added -->
           <div id="advanced-properties-container">
             <p style="grid-column: 1 / -1; color: #666; margin-bottom: 15px;">Define less common or technical settings here. They will appear under an "Advanced" tab in the Page Builder property editor.</p>
           </div>
           <button id="add-advanced-property" type="button" style="margin-top: 15px;">Add Advanced Property</button>
         </div>
       </div>
       <!-- Defaults Section -->
      <div class="accordion-item">
         <button class="accordion-header" type="button">Defaults</button>
         <div class="accordion-body" id="defaults-accordion-body">
           <!-- Container where default value inputs will be added dynamically -->
           <div id="defaults-container">
             <p style="grid-column: 1 / -1; color: #666; margin-bottom: 15px;">Set initial values for properties when the component is first added to a page. Changes to properties or their types above will update this section.</p>
           </div>
         </div>
       </div>
       <div class="accordion-item">
        <button class="accordion-header" type="button">Dependencies</button>
        <div class="accordion-body" id="dependencies-accordion-body">
            <p style="grid-column: 1 / -1; color: #666; margin-bottom: 15px;">
                Declare other Flex Components (like shared libraries, e.g., 'mmx-base') that this component requires to function correctly.
            </p>
            <!-- Container where dependency rows will be added dynamically -->
            <div id="dependencies-list"></div>
            <button id="add-dependency" type="button" style="margin-top: 15px; grid-column: 1 / -1; justify-self: start;">Add Dependency</button>
        </div>
      </div>
    </div>
  `;

	// --- Get Element References for Static Parts ---
	const propertiesContainer = formContainer.querySelector("#properties-container");
	const addPropertyButton = formContainer.querySelector("#add-property");
	const advancedPropertiesContainer = formContainer.querySelector("#advanced-properties-container");
	const addAdvancedPropertyButton = formContainer.querySelector("#add-advanced-property");
	const defaultsContainer = formContainer.querySelector("#defaults-container");
	const componentCodeInput = formContainer.querySelector('input[name="component_code"]');
	const cssFilenamePreview = formContainer.querySelector(".filename-preview.css-filename");
	const jsFilenamePreview = formContainer.querySelector(".filename-preview.js-filename");
	const includeCSSCheckbox = formContainer.querySelector('input[name="include_css"]');
	const cssAttributesContainer = formContainer.querySelector("#css-attributes-container");
	const cssAttributesList = formContainer.querySelector("#css-attributes-list");
	const addCSSAttributeButton = formContainer.querySelector("#add-css-attribute");
	const includeJSCheckbox = formContainer.querySelector('input[name="include_js"]');
	const jsAttributesContainer = formContainer.querySelector("#js-attributes-container");
	const jsAttributesList = formContainer.querySelector("#js-attributes-list");
	const addJSAttributeButton = formContainer.querySelector("#add-js-attribute");
	const dependenciesListContainer = formContainer.querySelector("#dependencies-list");
	const addDependencyButton = formContainer.querySelector("#add-dependency");

	// --- Setup Initial Event Listeners for Component Details ---
	// Update filenames and potentially resource group code when component code changes.
	componentCodeInput.addEventListener(
		"input",
		debounce(() => {
			// Sanitize code input (lowercase, numbers, hyphens).
			let code = componentCodeInput.value
				.trim()
				.toLowerCase()
				.replace(/[^a-z0-9-]/g, "");
			if (!code) code = "component"; // Default if empty.
			componentCodeInput.value = code; // Update input value with sanitized code.
			// Update filename previews.
			if (cssFilenamePreview) cssFilenamePreview.textContent = `${code}.css`;
			if (jsFilenamePreview) jsFilenamePreview.textContent = `${code}.js`;
			// Update resource group code input intelligently (only if it seems unset or matches previous code).
			const resourceCodeInput = formContainer.querySelector('input[name="resourcegroup_code"]');
			if (resourceCodeInput && (resourceCodeInput.value === "my-component" || resourceCodeInput.value === "component" || resourceCodeInput.value === componentCodeInput.dataset.previousCode || !resourceCodeInput.value)) {
				resourceCodeInput.value = code;
			}
			componentCodeInput.dataset.previousCode = code; // Store current code for next check.
		}, 250)
	);
	componentCodeInput.dispatchEvent(new Event("input")); // Trigger initial update.

	// Dependencies Section Listener
	addDependencyButton.addEventListener("click", () => {
		addDependencyRow(dependenciesListContainer);
	});
	// Optional: Add one initial dependency row if desired
	addDependencyRow(dependenciesListContainer);

	// Show/hide attribute sections based on checkbox state.
	includeCSSCheckbox.addEventListener("change", () => {
		cssAttributesContainer.style.display = includeCSSCheckbox.checked ? "block" : "none";
	});
	includeJSCheckbox.addEventListener("change", () => {
		jsAttributesContainer.style.display = includeJSCheckbox.checked ? "block" : "none";
	});
	// Add attribute rows when buttons are clicked.
	addCSSAttributeButton.addEventListener("click", () => addAttributeRow(cssAttributesList, "css_attribute"));
	addJSAttributeButton.addEventListener("click", () => addAttributeRow(jsAttributesList, "js_attribute"));
	// Add initial attribute rows
	addAttributeRow(cssAttributesList, "css_attribute");
	addAttributeRow(jsAttributesList, "js_attribute");

	/**
	 * Creates the appropriate HTML input element for setting a default value for a given property type.
	 *
	 * @param {string} inputType - The type of the property/field (e.g., 'text', 'number', 'checkbox', 'select').
	 * @param {string} inputId - A unique ID for the input element (used for label association).
	 * @param {string} inputName - The `name` attribute for the input element, determining its place in the structured form data.
	 * @param {object} [options={}] - Additional options:
	 * @param {string} [options.placeholder] - Placeholder text for the input.
	 * @param {string} [options.optionsHTML] - Pre-generated HTML string for select options (used rarely).
	 * @param {HTMLElement} [options.optionsContainer] - The container element holding the defined options (used for select/radio/selector).
	 * @param {number} [options.rows] - Number of rows for textarea.
	 * @returns {HTMLElement|null} - The created input/select/textarea/div element or null if type is not handled simply.
	 */
	function renderDefaultInputElement(inputType, inputId, inputName, options = {}) {
		let inputElement = null;
		switch (inputType) {
			case "checkbox":
				// Use a select dropdown for boolean defaults (True/False/None).
				inputElement = document.createElement("select");
				inputElement.innerHTML = `<option value="">-- No Default --</option><option value="true">True</option><option value="false">False</option>`;
				break;
			case "select":
			case "radio":
			case "selector":
				// Create a select dropdown populated with the options defined in the property's configuration.
				inputElement = document.createElement("select");
				let selectOptionsHtml = '<option value="">-- No Default --</option>';
				// Check if options are available from the property's options UI container.
				if (options.optionsContainer) {
					const definedOptions = Array.from(options.optionsContainer.querySelectorAll(":scope > .option-row"))
						.map((row) => {
							// Extract text and value from the option row inputs.
							const textInput = row.querySelector('input[name$="[text]"]');
							const valueInput = row.querySelector('input[name$="[value]"]');
							return textInput?.value && valueInput?.value ? {text: textInput.value.trim(), value: valueInput.value.trim()} : null;
						})
						.filter((opt) => opt); // Filter out invalid options.
					if (definedOptions.length > 0) {
						// Build <option> tags from valid definitions.
						selectOptionsHtml += definedOptions.map((opt) => `<option value="${opt.value}">${opt.text}</option>`).join("");
					} else {
						// Indicate that options need to be defined first.
						selectOptionsHtml += '<option value="" disabled>Define options first</option>';
						inputElement.disabled = true;
					}
				} else {
					// Fallback if options container isn't found (shouldn't happen).
					selectOptionsHtml += '<option value="" disabled>Options unavailable</option>';
					inputElement.disabled = true;
				}
				inputElement.innerHTML = selectOptionsHtml;
				break;
			case "number":
			case "slider":
			case "distributedslider":
				inputElement = document.createElement("input");
				inputElement.type = "number";
				inputElement.placeholder = options.placeholder || "e.g., 10";
				break;
			case "date":
				inputElement = document.createElement("input");
				inputElement.type = "date";
				break;
			case "datetime":
				// Standard HTML datetime-local input type can be inconsistent, use text with placeholder.
				inputElement = document.createElement("input");
				inputElement.type = "text";
				inputElement.placeholder = options.placeholder || "YYYY-MM-DDTHH:MM"; // Suggest format
				break;
			case "textarea":
			case "texteditor": // Use a simple textarea for default texteditor value.
				inputElement = document.createElement("textarea");
				inputElement.rows = options.rows || 2;
				inputElement.placeholder = options.placeholder || "Enter default text";
				break;
			case "color":
				// Use a combination of color input and text input for better usability.
				const colorContainer = document.createElement("div");
				colorContainer.style.display = "flex";
				colorContainer.style.alignItems = "center";
				inputElement = document.createElement("input");
				inputElement.type = "color";
				let colorTextInput = document.createElement("input");
				colorTextInput.type = "text";
				colorTextInput.placeholder = "#RRGGBB";
				colorTextInput.style.marginLeft = "5px";
				colorTextInput.style.flexGrow = "1";
				// Use a non-standard name for the text input to avoid conflict during form processing.
				// The actual default value is taken from the color input.
				colorTextInput.name = `${inputName}_text_companion`;
				// Sync inputs: color picker updates text, valid text updates color picker.
				inputElement.addEventListener("input", () => {
					if (colorTextInput) colorTextInput.value = inputElement.value;
				});
				colorTextInput.addEventListener("input", () => {
					if (inputElement && /^#[0-9A-F]{6}$/i.test(colorTextInput.value)) {
						inputElement.value = colorTextInput.value;
					}
				});
				colorContainer.appendChild(inputElement);
				colorContainer.appendChild(colorTextInput);
				inputElement = colorContainer; // Return the container div.
				break;
			case "image": // Simple text input for default image path. Responsive handled separately.
			case "imagetype":
			case "link":
			case "product":
			case "category":
			case "customlookup": // Simple text input for the default selected value (e.g., product code).
			case "productcustomfieldlookup":
			case "text": // Catches text, email, url, tel, password.
			default: // Fallback to text input.
				inputElement = document.createElement("input");
				inputElement.type = "text";
				inputElement.placeholder = options.placeholder || `Enter default ${inputType} value`;
				break;
		}

		// Assign ID and Name to the primary input element (not the container div for color).
		if (inputElement && inputElement.tagName !== "DIV") {
			inputElement.id = inputId;
			inputElement.name = inputName;
		} else if (inputElement && inputElement.tagName === "DIV" && inputType === "color") {
			// For color, assign ID/Name to the actual <input type="color"> inside the container.
			const colorInput = inputElement.querySelector('input[type="color"]');
			if (colorInput) {
				colorInput.id = inputId;
				colorInput.name = inputName;
			}
		}

		return inputElement;
	}

	/**
	 * Renders the default input field(s) for a single property, handling nesting
	 * for groups and text settings. Appends the created elements to the container.
	 *
	 * @param {HTMLElement} container - The DOM element to append the default inputs to (e.g., `#defaults-container` or a group's container).
	 * @param {HTMLElement} propertyRowElement - The accordion item element (`.property-row`) for the property being processed.
	 * @param {string} parentNamePrefix - The base `name` attribute prefix for the default value input(s) being generated.
	 *                                    Examples: `defaults[prop_code]`, `defaults[advanced][prop_code]`,
	 *                                    `defaults[group_code][children][child_prop_code]`,
	 *                                    `defaults[prop_code][textsettings][setting_code]`.
	 */
	function renderSingleDefault(container, propertyRowElement, parentNamePrefix) {
		// Get references to essential elements within the property row.
		const typeSelect = propertyRowElement.querySelector(`select[name$="[type]"]`);
		const codeInput = propertyRowElement.querySelector(`input[name$="[code]"]`);
		const promptInput = propertyRowElement.querySelector(`input[name$="[prompt]"]`);
		const listTypeSelect = propertyRowElement.querySelector(`select[name$="[list_type]"]`); // For lists

		// Basic validation.
		if (!typeSelect || !codeInput || !promptInput) return;

		const propertyType = typeSelect.value;
		const propertyCode = codeInput.value.trim();
		const propertyPrompt = promptInput.value.trim() || propertyCode; // Use code as fallback prompt.
		// Check if the property is advanced based on the name prefix.
		const isAdvanced = parentNamePrefix.includes("[advanced]");

		// Skip if code is missing or if type is not suitable for simple defaults.
		if (!propertyCode) return;
		const skipTypes = ["grouplist", "fragment"]; // Types without direct default UI here.
		if (skipTypes.includes(propertyType)) return;

		// --- Create Wrapper for all defaults related to this property ---
		// Using 'display: contents' allows grid layout inheritance.
		const defaultEntryWrapper = document.createElement("div");
		defaultEntryWrapper.classList.add("default-entry-wrapper");
		defaultEntryWrapper.style.display = "contents"; // Act as a pass-through for grid items.

		let mainDefaultEntryDiv = null; // Holds the primary default input field/container.

		// --- Handle Group Recursively ---
		if (propertyType === "group") {
			// Create a container for the group's child defaults.
			const groupDefaultsContainer = document.createElement("div");
			groupDefaultsContainer.classList.add("default-group-container");
			groupDefaultsContainer.style.display = "contents"; // Pass-through grid layout.
			groupDefaultsContainer.style.gridColumn = "1 / -1"; // Span full width.

			// Add a heading for the group defaults section.
			const groupHeading = document.createElement("h5");
			groupHeading.textContent = `Defaults for group '${propertyPrompt}':`;
			groupHeading.style.cssText = `grid-column: 1 / -1; margin-top: 15px; margin-bottom: 5px; border-top: 1px dashed #ccc; padding-top: 15px; font-weight: bold;`;
			groupDefaultsContainer.appendChild(groupHeading);

			let hasChildren = false;
			// Find the container holding the child property rows within the group's UI.
			const childPropertiesContainer = propertyRowElement.querySelector(".child-properties-container");
			if (childPropertiesContainer) {
				// Iterate over each child property row defined in the UI.
				childPropertiesContainer.querySelectorAll(":scope > .property-row").forEach((childRow) => {
					const childCodeInput = childRow.querySelector(`input[name$="[code]"]`);
					// Only process children with a valid code.
					if (childCodeInput && childCodeInput.value.trim()) {
						const childCode = childCodeInput.value.trim();
						// --- CORRECTED RECURSIVE CALL ---
						// Construct the name prefix for the child default, nesting under 'children'.
						// Example: defaults[group_code][children][child_code][value]
						renderSingleDefault(groupDefaultsContainer, childRow, `${parentNamePrefix}[children][${childCode}]`);
						hasChildren = true;
					}
				});
			}
			// Only append the group container if it actually contains child defaults.
			if (hasChildren) {
				defaultEntryWrapper.appendChild(groupDefaultsContainer);
			}
		}
		// --- Handle List Types ---
		else if (propertyType === "list") {
			const listType = listTypeSelect ? listTypeSelect.value : "text";
			// Currently, no UI for setting defaults for list:group items.
			if (listType === "group") {
				const placeholder = document.createElement("div");
				placeholder.classList.add("default-entry", "property-field", "placeholder-message");
				placeholder.innerHTML = `<label>${propertyPrompt}:</label><div><em>Defaults for 'list:group' items cannot be set here.</em></div>`;
				mainDefaultEntryDiv = placeholder;
			} else {
				// For simple list types, use a textarea for comma-separated values.
				mainDefaultEntryDiv = document.createElement("div");
				mainDefaultEntryDiv.classList.add("default-entry", "property-field", "full-width"); // Span full width
				const label = document.createElement("label");
				const inputId = `default-${propertyCode}-csv-${isAdvanced ? "adv" : "std"}`;
				label.htmlFor = inputId;
				label.textContent = `${propertyPrompt} (${listType} list):`;
				label.title = `Default values for list '${propertyCode}'. Enter comma-separated values.`;
				const controlContainer = document.createElement("div");
				const inputElement = document.createElement("textarea");
				inputElement.id = inputId;
				inputElement.rows = 2;
				// Use a special name 'value_csv' which is processed into an array in preview.js.
				inputElement.name = `${parentNamePrefix}[value_csv]`;
				inputElement.placeholder = `e.g., value1,value2,value3`;
				controlContainer.appendChild(inputElement);
				mainDefaultEntryDiv.appendChild(label);
				mainDefaultEntryDiv.appendChild(controlContainer);
			}
		}
		// --- Handle Standard / Simple Types ---
		else {
			// Create the main container for the default input.
			mainDefaultEntryDiv = document.createElement("div");
			mainDefaultEntryDiv.classList.add("default-entry", "property-field"); // Standard grid field
			mainDefaultEntryDiv.style.display = "contents"; // Make label/div grid items directly

			const label = document.createElement("label");
			// Unique ID for the input element.
			const inputId = `default-${propertyCode}-${isAdvanced ? "adv" : "std"}-prop`;
			label.htmlFor = inputId;
			label.textContent = `${propertyPrompt}:`;
			label.title = `Default value for '${propertyCode}' (${propertyType})`;
			label.style.gridColumn = "1"; // Explicitly place in grid

			const controlContainer = document.createElement("div");
			controlContainer.style.gridColumn = "2"; // Explicitly place in grid
			// Standard name for the main value: parentPrefix[value]
			const valueInputName = `${parentNamePrefix}[value]`;

			let inputElement = null;

			// Special handling for 'image' type to include responsive defaults.
			if (propertyType === "image") {
				mainDefaultEntryDiv.style.gridColumn = "1 / -1"; // Make the whole section span width
				mainDefaultEntryDiv.style.display = "block"; // Change display from 'contents'
				mainDefaultEntryDiv.classList.remove("property-field"); // Remove class if display is not 'contents'

				const imageFieldWrapper = document.createElement("div"); // Create wrapper for label/input grid
				imageFieldWrapper.classList.add("property-field");
				imageFieldWrapper.style.display = "contents"; // Use contents here for grid

				label.textContent = `${propertyPrompt} (Image):`; // Update label text
				// Input for the main default image path.
				const mainImageInput = document.createElement("input");
				mainImageInput.type = "text";
				mainImageInput.name = valueInputName;
				mainImageInput.id = inputId;
				mainImageInput.placeholder = "Default image path";
				controlContainer.appendChild(mainImageInput); // Add to control container
				imageFieldWrapper.appendChild(label); // Add label to wrapper
				imageFieldWrapper.appendChild(controlContainer); // Add control container to wrapper
				mainDefaultEntryDiv.appendChild(imageFieldWrapper); // Add wrapper to main div

				// Container for responsive image defaults.
				const responsiveDefaultsContainer = document.createElement("div");
				responsiveDefaultsContainer.style.marginTop = "10px";
				responsiveDefaultsContainer.style.paddingTop = "10px";
				responsiveDefaultsContainer.style.borderTop = "1px dotted #ccc";
				responsiveDefaultsContainer.style.marginLeft = "15px"; // Indent
				responsiveDefaultsContainer.style.display = "grid"; // Use grid for nested defaults
				responsiveDefaultsContainer.style.gridTemplateColumns = "minmax(115px, auto) 1fr"; // Adjust label width
				responsiveDefaultsContainer.style.gap = "8px 10px";

				const respHeading = document.createElement("label");
				respHeading.textContent = "Responsive Defaults:";
				respHeading.style.fontWeight = "bold";
				respHeading.style.gridColumn = "1 / -1";
				respHeading.style.marginBottom = "5px";
				responsiveDefaultsContainer.appendChild(respHeading);

				let hasResponsiveFields = false;
				// Find the responsive image definitions in the property's UI.
				const responsiveImagesList = propertyRowElement.querySelector(".responsive-images-list");
				if (responsiveImagesList) {
					responsiveImagesList.querySelectorAll(":scope > .responsive-image-row").forEach((respRow) => {
						const respCodeInput = respRow.querySelector('input[name$="[code]"]');
						const respPromptInput = respRow.querySelector('input[name$="[prompt]"]');
						// Only create default input if code is defined.
						if (respCodeInput?.value.trim() && respPromptInput) {
							hasResponsiveFields = true;
							const respCode = respCodeInput.value.trim();
							const respPrompt = respPromptInput.value.trim() || respCode; // Fallback prompt
							const respLabel = document.createElement("label");
							const respInputId = `default-${propertyCode}-resp-${respCode}-${isAdvanced ? "adv" : "std"}`;
							respLabel.htmlFor = respInputId;
							respLabel.textContent = `${respPrompt} (${respCode}):`;
							respLabel.style.gridColumn = "1";
							const respControlDiv = document.createElement("div");
							respControlDiv.style.gridColumn = "2";
							const respInput = document.createElement("input");
							respInput.type = "text";
							respInput.id = respInputId;
							// --- Correct Name for Responsive Image Default ---
							// Nested under 'responsive_images' key, keyed by the responsive code.
							// Example: defaults[img_prop][responsive_images][mobile]
							respInput.name = `${parentNamePrefix}[responsive_images][${respCode}]`;
							respInput.placeholder = `Path for ${respCode} size`;
							respControlDiv.appendChild(respInput);
							responsiveDefaultsContainer.appendChild(respLabel);
							responsiveDefaultsContainer.appendChild(respControlDiv);
						}
					});
				}
				// Append the responsive defaults section or a message if none defined.
				if (hasResponsiveFields) {
					mainDefaultEntryDiv.appendChild(responsiveDefaultsContainer);
				} else {
					const noRespMsg = document.createElement("em");
					noRespMsg.textContent = "(No responsive sizes defined)";
					noRespMsg.style.fontSize = "0.9em";
					noRespMsg.style.color = "#777";
					noRespMsg.style.marginLeft = "15px";
					noRespMsg.style.display = "block";
					mainDefaultEntryDiv.appendChild(noRespMsg);
				}
				inputElement = null; // Input handled within the structure above.
			} else {
				// For all other simple types, generate the default input element.
				const renderOptions = {
					placeholder: `Default ${propertyType} value`,
					// Pass the options container if relevant (for select/radio/selector).
					optionsContainer: ["select", "radio", "selector"].includes(propertyType) ? propertyRowElement.querySelector(".options-container") : null,
				};
				inputElement = renderDefaultInputElement(propertyType, inputId, valueInputName, renderOptions);
			}

			// Append the input element (or its container for color) to the control div.
			if (inputElement) {
				controlContainer.appendChild(inputElement);
			}
			// Only add the label and control container if a control was actually created.
			if (controlContainer.hasChildNodes()) {
				mainDefaultEntryDiv.appendChild(label);
				mainDefaultEntryDiv.appendChild(controlContainer);
			} else {
				// If no control was created (e.g., unsupported type), nullify the main div.
				mainDefaultEntryDiv = null;
			}
		} // End else (Handle Standard / Simple Types)

		// Append the main default entry div (if created) to the wrapper FIRST.
		if (mainDefaultEntryDiv) {
			defaultEntryWrapper.appendChild(mainDefaultEntryDiv);
		}

		// --- Render NESTED defaults for Text Settings Fields ---
		const textSettingsContainer = propertyRowElement.querySelector(".textsettings-container");
		const enableCheckbox = textSettingsContainer?.querySelector('input[name$="[enable_textsettings]"]');

		// Only proceed if text settings are enabled in the UI.
		if (enableCheckbox?.checked) {
			const fieldsContainer = textSettingsContainer.querySelector(".fields-container");
			const settingFields = fieldsContainer?.querySelectorAll(":scope > .field-row"); // Get all defined setting fields.

			if (settingFields?.length > 0) {
				// Create a container for ALL text setting defaults related to this parent property.
				const textSettingsDefaultsContainer = document.createElement("div");
				textSettingsDefaultsContainer.classList.add("text-settings-defaults-group", "property-field", "full-width");
				textSettingsDefaultsContainer.style.paddingLeft = "15px"; // Indent slightly.
				textSettingsDefaultsContainer.style.marginTop = "10px";
				textSettingsDefaultsContainer.style.borderTop = "1px dotted #ccc";
				// Use grid layout for alignment within this nested section.
				textSettingsDefaultsContainer.style.display = "grid";
				textSettingsDefaultsContainer.style.gridTemplateColumns = "minmax(130px, auto) 1fr"; // Label/Input.
				textSettingsDefaultsContainer.style.gap = "8px 10px";
				textSettingsDefaultsContainer.style.alignItems = "baseline";
				textSettingsDefaultsContainer.style.gridColumn = "1 / -1"; // Span full width relative to parent default grid.

				// Add a heading for this section.
				const tsHeading = document.createElement("label"); // Use label for grid alignment
				tsHeading.textContent = `Text Settings Defaults:`;
				tsHeading.style.fontWeight = "bold";
				tsHeading.style.fontStyle = "italic";
				tsHeading.style.marginBottom = "5px";
				tsHeading.style.gridColumn = "1 / -1"; // Heading spans both columns.
				textSettingsDefaultsContainer.appendChild(tsHeading);

				let hasAnyTextSettingDefaults = false;

				// Iterate through each text setting field defined in the UI.
				settingFields.forEach((fieldRow) => {
					const settingCodeInput = fieldRow.querySelector('input[name$="[code]"]');
					const settingPromptInput = fieldRow.querySelector('input[name$="[prompt]"]');
					const settingTypeSelect = fieldRow.querySelector('select[name$="[type]"]');

					// Check if essential details are present for the setting field.
					if (settingCodeInput?.value && settingPromptInput?.value && settingTypeSelect?.value) {
						const settingCode = settingCodeInput.value.trim();
						const settingPrompt = settingPromptInput.value.trim();
						const settingType = settingTypeSelect.value;

						// Create label and input for this specific setting's default value.
						const label = document.createElement("label");
						// Unique ID incorporating parent property code and setting code.
						const inputId = `default-${propertyCode}-ts-${settingCode}-${isAdvanced ? "adv" : "std"}`;
						label.htmlFor = inputId;
						label.textContent = `${settingPrompt}:`; // Use the setting's prompt.
						label.title = `Default for text setting '${settingCode}' (${settingType})`;
						label.style.gridColumn = "1";

						const controlContainer = document.createElement("div");
						controlContainer.style.gridColumn = "2";

						// --- Name Structure for Text Setting Default ---
						// Nested under 'textsettings', then the setting code, then 'value'.
						// Example: defaults[prop_code][textsettings][font_size][value]
						// Example: defaults[group_code][children][prop_code][textsettings][color][value]
						const settingValueInputName = `${parentNamePrefix}[textsettings][${settingCode}][value]`;

						// Prepare options for the default input renderer.
						const renderOptions = {
							placeholder: `Default ${settingType}`,
							// Pass the options container from the setting field row if needed.
							optionsContainer: ["select", "radio"].includes(settingType) ? fieldRow.querySelector(".options-container") : null,
						};
						// Generate the input element.
						const inputElement = renderDefaultInputElement(settingType, inputId, settingValueInputName, renderOptions);

						// Append label and control if input was created.
						if (inputElement) {
							controlContainer.appendChild(inputElement);
							// Append label and control div directly to the textSettingsDefaultsContainer grid.
							textSettingsDefaultsContainer.appendChild(label);
							textSettingsDefaultsContainer.appendChild(controlContainer);
							hasAnyTextSettingDefaults = true;
						}
					}
				}); // End settingFields.forEach

				// Only append the text settings container if it has any actual default fields.
				if (hasAnyTextSettingDefaults) {
					defaultEntryWrapper.appendChild(textSettingsDefaultsContainer);
				}
			}
		} // --- End Text Settings Defaults ---

		// Append the wrapper (containing main default + group/textsetting defaults) to the main container.
		if (defaultEntryWrapper.hasChildNodes()) {
			container.appendChild(defaultEntryWrapper);
		}
	} // --- End renderSingleDefault ---

	/**
	 * Debounced function to regenerate the entire "Defaults" section of the UI.
	 * It preserves existing default values, clears the section, and then re-renders
	 * default inputs for all currently defined standard and advanced properties.
	 */
	const populateDefaultsSection = debounce(() => {
		// --- Preserve existing values ---
		// Create an object to store current values from the defaults section before clearing it.
		const existingDefaults = {};
		defaultsContainer.querySelectorAll("input, select, textarea").forEach((input) => {
			// Check for valid name attribute.
			if (input.name) {
				const name = input.name;
				let value;
				// Get value based on input type.
				if (input.type === "checkbox") {
					value = input.checked;
				} // Should not happen with current boolean handling (uses select)
				else if (input.tagName === "SELECT") {
					// Special handling for the boolean select (True/False/None).
					if (input.options.length === 3 && input.options[1].value === "true" && input.options[2].value === "false") {
						value =
							input.value === "true" ? true
							: input.value === "false" ? false
							: null; // Convert 'true'/'false' string to boolean
					} else {
						value = input.value; // Standard select value.
					}
				} else if (input.type === "color") {
					// For color, always store the hex value from the color picker.
					value = input.value;
				} else {
					value = input.value;
				} // Text, textarea, number, etc.

				// Store the value if it's not empty or null/undefined, OR if it's an actual boolean (false is valid).
				// Don't store empty strings unless it's from a boolean select that was explicitly set to 'No Default'.
				if ((value !== "" && value !== null && value !== undefined) || typeof value === "boolean") {
					// Store null for the boolean select if 'No Default' was selected.
					if (value === null && input.tagName === "SELECT" && input.options.length === 3 && input.options[1].value === "true") {
						existingDefaults[name] = null;
					} else if (value !== null) {
						// Store actual booleans and non-empty/non-null strings/numbers.
						existingDefaults[name] = value;
					}
				}
			}
		});
		// console.log("Preserved Defaults:", JSON.stringify(existingDefaults)); // For debugging

		// --- Clear and rebuild ---
		// Clear the existing defaults UI, keeping the introductory paragraph.
		defaultsContainer.innerHTML = '<p style="grid-column: 1 / -1; color: #666; margin-bottom: 15px;">Set initial values for properties when the component is first added to a page. Changes to properties or their types above will update this section.</p>';

		// --- Process Standard Properties ---
		let hasStandardProperties = false;
		propertiesContainer.querySelectorAll(":scope > .property-row").forEach((propertyRow) => {
			const codeInput = propertyRow.querySelector(`input[name$="[code]"]`);
			// Only render defaults for properties that have a code defined.
			if (codeInput && codeInput.value.trim()) {
				hasStandardProperties = true;
				const propCode = codeInput.value.trim();
				// Render the default input(s) for this property.
				// The name prefix starts with 'defaults[prop_code]'.
				renderSingleDefault(defaultsContainer, propertyRow, `defaults[${propCode}]`);
			}
		});

		// --- Process Advanced Properties ---
		// Create a wrapper to contain all advanced defaults and a heading.
		const advancedDefaultsWrapper = document.createElement("div");
		advancedDefaultsWrapper.innerHTML = `<h4 style="grid-column: 1 / -1; margin-top: 20px; padding-top: 15px; border-top: 1px solid #ccc; margin-bottom: 10px;">Advanced Defaults</h4>`;
		advancedDefaultsWrapper.style.display = "contents"; // Pass-through grid layout.
		advancedDefaultsWrapper.style.gridColumn = "1 / -1";

		let hasAdvancedProperties = false;
		let hasRenderedAdvancedDefaultsContent = false; // Track if any *actual* inputs were added.
		advancedPropertiesContainer.querySelectorAll(":scope > .property-row").forEach((propertyRow) => {
			const codeInput = propertyRow.querySelector(`input[name$="[code]"]`);
			// Only render defaults for advanced properties with a code.
			if (codeInput && codeInput.value.trim()) {
				hasAdvancedProperties = true;
				const propCode = codeInput.value.trim();
				// Render the default input(s) for this advanced property.
				// The name prefix starts with 'defaults[advanced][prop_code]'.
				renderSingleDefault(advancedDefaultsWrapper, propertyRow, `defaults[advanced][${propCode}]`);
				// Check if renderSingleDefault actually added any elements besides the heading.
				if (Array.from(advancedDefaultsWrapper.children).some((el) => el.tagName !== "H4")) {
					hasRenderedAdvancedDefaultsContent = true;
				}
			}
		});

		// Append the advanced defaults section only if there were advanced properties
		// AND at least one of them resulted in a default input field being rendered.
		if (hasAdvancedProperties && hasRenderedAdvancedDefaultsContent) {
			defaultsContainer.appendChild(advancedDefaultsWrapper);
		} else if (hasAdvancedProperties && !hasRenderedAdvancedDefaultsContent) {
			// If advanced props exist but none were renderable for defaults, show a message.
			const noAdvMsg = document.createElement("em");
			noAdvMsg.textContent = "(No advanced properties eligible for simple defaults, group children, or text settings)";
			noAdvMsg.style.gridColumn = "1 / -1";
			noAdvMsg.style.color = "#777";
			noAdvMsg.style.fontSize = "0.9em";
			advancedDefaultsWrapper.appendChild(noAdvMsg);
			defaultsContainer.appendChild(advancedDefaultsWrapper);
		}

		// Display a message if no properties (standard or advanced) have been defined yet.
		if (!hasStandardProperties && !hasAdvancedProperties) {
			const noPropsMsg = document.createElement("em");
			noPropsMsg.textContent = "(Add properties in the sections above to set their default values)";
			noPropsMsg.style.gridColumn = "1 / -1";
			noPropsMsg.style.color = "#777";
			noPropsMsg.style.fontSize = "0.9em";
			defaultsContainer.appendChild(noPropsMsg);
		}

		// --- Restore values ---
		// Iterate through the preserved default values and apply them back to the newly rendered inputs.
		Object.keys(existingDefaults).forEach((name) => {
			const input = defaultsContainer.querySelector(`[name="${name}"]`);
			if (input) {
				const storedValue = existingDefaults[name];
				if (input.tagName === "SELECT") {
					// Handle the boolean select specifically.
					if (input.options.length === 3 && input.options[1].value === "true" && input.options[2].value === "false") {
						input.value =
							storedValue === true ? "true"
							: storedValue === false ? "false"
							: ""; // Restore 'true', 'false', or '' (for null/None)
					} else {
						// For other selects, restore value only if the option still exists.
						input.value = Array.from(input.options).some((opt) => opt.value === storedValue) ? storedValue : "";
					}
				} else if (input.type === "checkbox") {
					// Should not be hit with current boolean handling
					input.checked = !!storedValue;
				} else if (input.type === "color") {
					// Restore both color picker and its companion text input.
					const colorContainer = input.closest("div"); // Find the flex container
					const colorPicker = colorContainer?.querySelector('input[type="color"]');
					const textInput = colorContainer?.querySelector('input[type="text"][name$="_text_companion"]');
					// Ensure we found both elements and the name matches the stored key (targets the color picker).
					if (colorPicker && textInput && colorPicker.name === name) {
						// Restore only if the stored value is a valid hex color string.
						if (typeof storedValue === "string" && /^#[0-9A-F]{6}$/i.test(storedValue)) {
							colorPicker.value = storedValue;
							textInput.value = storedValue;
						} else {
							// Reset if stored value is invalid.
							colorPicker.value = "#000000"; // Default color
							textInput.value = "";
						}
					}
				} else {
					// Restore value for text, textarea, number, etc. Use empty string if stored value is null/undefined.
					input.value = storedValue ?? "";
				}
			}
		});

		// Minor fix: Ensure companion text input for color pickers is synced after potential restoration.
		// This handles cases where only the color picker value might have been restored directly.
		defaultsContainer.querySelectorAll('input[type="color"]').forEach((colorPicker) => {
			const textInput = colorPicker.parentElement?.querySelector('input[type="text"][name$="_text_companion"]');
			if (textInput && colorPicker.value && /^#[0-9A-F]{6}$/i.test(colorPicker.value)) {
				textInput.value = colorPicker.value;
			}
		});
	}, 200); // Debounce interval for regenerating defaults section.

	// --- Event Listeners for Adding Properties and Updating Defaults ---
	// Add Standard Property Button
	addPropertyButton.addEventListener("click", () => {
		addPropertyRow(propertiesContainer, "properties");
		// Note: The defaults section is updated automatically via the 'property-updated'
		// event dispatched within addPropertyRow after the type select changes.
	});
	// Add Advanced Property Button
	addAdvancedPropertyButton.addEventListener("click", () => {
		addPropertyRow(advancedPropertiesContainer, "advanced_properties");
		// Defaults section also updated via 'property-updated' event.
	});

	// Listen for property updates/removals on BOTH property containers using event bubbling.
	// This triggers the regeneration of the defaults section whenever properties are modified.
	const formElement = formContainer.closest("form"); // Find the parent form
	if (formElement) {
		formElement.addEventListener("property-updated", populateDefaultsSection);
		formElement.addEventListener("property-removed", populateDefaultsSection);
	} else {
		console.error("Could not find parent form element to attach default update listeners.");
	}

	// Initial population of the defaults section when the UI first loads.
	populateDefaultsSection();
} // --- End buildFormUI ---
