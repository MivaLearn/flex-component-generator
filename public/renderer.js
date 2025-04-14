// renderer.js

// Import configuration and utilities
import { BASE_TYPE_FIELDS, getFieldsForTextSubType } from './config.js';
import { debounce } from './utils.js';

// --- Rendering Helper Functions ---

/**
 * Renders the UI for adding text/value pairs (e.g., for select, radio).
 * @param {HTMLElement} container - The parent element to append the options UI to.
 * @param {string} propertyPathPrefix - The base name path for the property or parent field.
 * @param {number|null} fieldIndex - The index if this is within a textsettings field, otherwise null.
 * @param {string|null} baseName - Optional override for the input name base path.
 */
function renderOptionsField(container, propertyPathPrefix, fieldIndex = null, baseName = null) {
    if (baseName === null) {
        baseName = (fieldIndex !== null)
            ? `${propertyPathPrefix}[fields][${fieldIndex}][options]` // Correctly index into fields array
            : `${propertyPathPrefix}[options]`;
    }
    const optionsContainer = document.createElement("div"); optionsContainer.classList.add("options-container");
    const addOptionButton = document.createElement("button"); addOptionButton.type = "button"; addOptionButton.textContent = "Add Option"; addOptionButton.classList.add('btn-add-option'); addOptionButton.style.marginTop = '5px';
    addOptionButton.addEventListener("click", () => {
        const optionIndex = optionsContainer.querySelectorAll(':scope > .option-row').length;
        const optionRow = document.createElement("div"); optionRow.classList.add("option-row");
        optionRow.innerHTML = `<label>Text: <input type="text" name="${baseName}[${optionIndex}][text]" required></label><label>Value: <input type="text" name="${baseName}[${optionIndex}][value]" required></label><button type="button" class="remove-option">Remove</button>`;
        optionsContainer.insertBefore(optionRow, addOptionButton);
        optionRow.querySelector(".remove-option").addEventListener("click", () => optionRow.remove());
    });
    container.appendChild(optionsContainer); optionsContainer.appendChild(addOptionButton);
}

/**
 * Renders the specific configuration options for a given field type *within* a text setting.
 * @param {HTMLElement} container - The container to render options into (e.g., .textsettings-options-container).
 * @param {string} type - The selected field type (e.g., 'text', 'number').
 * @param {string} propertyPathPrefix - The base path for the parent textsettings property (e.g., "properties[0]").
 * @param {number} fieldIndex - The index of the field within the textsettings fields array.
 */
function renderTextSettingsOptions(container, type, propertyPathPrefix, fieldIndex) {
    container.innerHTML = ""; container.style.display = 'grid'; container.style.gridTemplateColumns = 'minmax(130px, auto) 1fr';
    container.style.gap = '10px 15px'; container.style.alignItems = 'baseline';
    const fields = TYPE_FIELDS[type] || []; // Use the globally processed TYPE_FIELDS

    fields.forEach((fieldConfig) => {
        const fieldName = typeof fieldConfig === 'string' ? fieldConfig : fieldConfig.name;
        // Skip fields defined at the field row level or handled specially
        if (['code', 'prompt', 'type', 'textsettings', 'visibility_conditions', 'fields', 'style', 'style_prefix', 'style_suffix'].includes(fieldName)) return;
        // If the setting type is 'text', only render the 'text_type' dropdown here
        if (type === 'text' && fieldName !== 'text_type') return;

        const fieldDef = typeof fieldConfig === 'object' ? fieldConfig : { name: fieldName, type: 'text' };
        const fieldType = fieldDef.type || 'text';
        const inputName = `${propertyPathPrefix}[fields][${fieldIndex}][${fieldName}]`; // Construct nested name
        let labelText = fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_/g, ' ');
        const helpText = fieldDef.helpText || `Configure the ${labelText} for this setting.`;

        // Create label and control wrapper for grid layout
        const labelElement = document.createElement('label'); labelElement.textContent = labelText; labelElement.title = helpText; labelElement.style.gridColumn = '1';
        const controlWrapper = document.createElement('div'); controlWrapper.style.gridColumn = '2';
        let controlElement = null;

        // Render control based on type
        if (fieldType === 'boolean') {
            labelElement.style.gridColumn = '1 / -1'; labelElement.style.display = 'flex'; labelElement.style.alignItems = 'center'; labelElement.style.fontWeight = 'normal';
            controlElement = document.createElement('input'); controlElement.type = 'checkbox'; controlElement.name = inputName; controlElement.value = 'true'; controlElement.style.width = 'auto'; controlElement.style.marginRight = '8px';
            labelElement.textContent = ''; labelElement.insertBefore(controlElement, labelElement.firstChild); labelElement.appendChild(document.createTextNode(` ${labelText}`));
            container.appendChild(labelElement); return; // Append label directly and exit iteration for this field
        } else if (fieldName === 'text_type' && fieldType === 'dropdown') {
            const optionsHtml = fieldDef.options.map(option => `<option value="${option.value}" ${option.value === fieldDef.default ? "selected" : ""}>${option.label}</option>`).join("");
            controlElement = document.createElement('select'); controlElement.name = inputName; controlElement.innerHTML = optionsHtml;
            // Attach listener, passing full path prefix and index
            attachTextTypeListener(controlElement, propertyPathPrefix, fieldIndex);
        } else if (fieldType === 'number' || ['min', 'max', 'step', 'minlength', 'maxlength'].includes(fieldName)) {
            controlElement = document.createElement('input'); controlElement.type = 'number'; controlElement.name = inputName; controlElement.placeholder = fieldDef.placeholder || '';
            if (fieldDef.step) controlElement.step = fieldDef.step; if (fieldDef.min !== undefined) controlElement.min = fieldDef.min; if (fieldDef.max !== undefined) controlElement.max = fieldDef.max;
        } else if (fieldType === 'dropdown' && fieldDef.options) {
            const optionsHtml = fieldDef.options.map(option => `<option value="${option.value}" ${option.value === fieldDef.default ? "selected" : ""}>${option.label}</option>`).join("");
            controlElement = document.createElement('select'); controlElement.name = inputName; controlElement.innerHTML = optionsHtml;
        } else if (fieldType === 'custom' && typeof fieldDef.render === "function") {
            // Handle custom renderers (like options) within text settings
             labelElement.style.gridColumn = '1 / -1'; labelElement.style.marginBottom = '5px'; controlWrapper.style.gridColumn = '1 / -1';
             // Pass the necessary context including the *nested* path prefix and field index
             fieldDef.render(controlWrapper, propertyPathPrefix, fieldIndex);
             controlElement = null; // Handled by custom render
        } else { // Default text input
             controlElement = document.createElement('input'); controlElement.type = 'text'; controlElement.name = inputName; controlElement.placeholder = fieldDef.placeholder || `Enter ${labelText}`;
        }

        // Append label and control wrapper if a control was created
        if (controlElement) { controlWrapper.appendChild(controlElement); }
        container.appendChild(labelElement);
        if (controlWrapper.hasChildNodes() || fieldType === 'custom' ) { // Append wrapper if it has content or was custom rendered
            container.appendChild(controlWrapper);
        }
    }); // End forEach fieldConfig

    // Trigger initial rendering of text subtype fields if text_type dropdown exists
    const textTypeSelect = container.querySelector(`select[name$="[text_type]"]`);
    if (textTypeSelect) {
        setTimeout(() => { if(textTypeSelect.isConnected) textTypeSelect.dispatchEvent(new Event('change')) }, 0);
    } else {
        // Hide the subtype container if the main type is not 'text'
        const textSubtypeOptionsContainer = container.closest('.field-row')?.querySelector('.text-subtype-options-container');
        if (textSubtypeOptionsContainer) {
            textSubtypeOptionsContainer.innerHTML = '';
            textSubtypeOptionsContainer.style.display = 'none';
        }
    }
}

/**
 * Renders the specific fields based on the selected text_type.
 * @param {HTMLElement} container - The container element (.text-subtype-options-container).
 * @param {string} textSubtype - The selected value from the text_type dropdown.
 * @param {string} propertyPathPrefix - The base path for the property or text setting field.
 * @param {number|null} fieldIndex - The index if inside a text setting's fields array, else null.
 */
function renderTextSubtypeFields(container, textSubtype, propertyPathPrefix, fieldIndex = null) {
    container.innerHTML = ''; container.style.display = 'grid'; container.style.gridTemplateColumns = 'minmax(130px, auto) 1fr';
    container.style.gap = '10px 15px'; container.style.alignItems = 'baseline';
    const subFields = getFieldsForTextSubType(textSubtype); // Get relevant fields
    // Construct base name path correctly for main property or nested text setting
    const baseName = (fieldIndex !== null) ? `${propertyPathPrefix}[fields][${fieldIndex}]` : propertyPathPrefix;

    if (subFields.length > 0) {
        subFields.forEach(fieldName => {
            const mainTextFields = BASE_TYPE_FIELDS.text || []; // Get original definitions for details
            const fieldDef = mainTextFields.find(f => typeof f === 'object' && f.name === fieldName) || { name: fieldName };
            const labelText = fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_/g, ' ');
            const helpText = fieldDef.helpText || `Configure the ${labelText}.`;
            const inputName = `${baseName}[${fieldName}]`; // Use correct base name

            // Create label and control wrapper for grid
            const labelElement = document.createElement('label'); labelElement.textContent = labelText; labelElement.style.gridColumn = '1'; labelElement.title = helpText;
            const controlWrapper = document.createElement('div'); controlWrapper.style.gridColumn = '2';
            let inputElement;
            if (['min', 'max', 'step', 'minlength', 'maxlength'].includes(fieldName)) {
                 inputElement = document.createElement('input'); inputElement.type = 'number';
            } else {
                 inputElement = document.createElement('input'); inputElement.type = 'text';
            }
            inputElement.placeholder = fieldDef.placeholder || labelText;
            inputElement.name = inputName;
            controlWrapper.appendChild(inputElement);
            container.appendChild(labelElement);
            container.appendChild(controlWrapper);
        });
    } else {
        container.style.display = 'none'; // Hide container if no subtype fields
    }
}

/**
 * Attaches the change event listener to a text_type select element.
 * @param {HTMLSelectElement} selectElement - The text_type dropdown element.
 * @param {string} propertyPathPrefix - The base name path for the property or text setting field.
 * @param {number|null} fieldIndex - The index if inside a text setting's fields array, else null.
 */
function attachTextTypeListener(selectElement, propertyPathPrefix, fieldIndex = null) {
    selectElement.addEventListener('change', (event) => {
        const selectedTextSubtype = event.target.value;
        let targetContainer = null;
        // Determine the correct container for subtype fields based on context
        if (fieldIndex !== null) { // Check if fieldIndex is provided (meaning we are inside textsettings)
            targetContainer = selectElement.closest('.field-row')?.querySelector('.text-subtype-options-container');
        } else { // Otherwise, it's for a main property (top-level or nested group)
            targetContainer = selectElement.closest('.accordion-body')?.querySelector('.property-options .text-subtype-options-container-main');
        }
        // Render the fields in the found container
        if (targetContainer) {
            renderTextSubtypeFields(targetContainer, selectedTextSubtype, propertyPathPrefix, fieldIndex);
        } else { console.error("Could not find target container for text subtype fields.", {propertyPathPrefix, fieldIndex}); }
    });
}

/**
 * Adds a row for CSS/JS attribute input.
 * @param {HTMLElement} listElement - The container (ul/div) to append the row to.
 * @param {string} namePrefix - The prefix for the input names (e.g., 'css_attribute').
 */
function addAttributeRow(listElement, namePrefix) {
    const index = listElement.children.length;
    const attrRow = document.createElement('div'); // Flex row
    attrRow.innerHTML = `
        <label title="Attribute name (e.g., 'media', 'defer')">Name: <input type="text" name="${namePrefix}_name[${index}]"></label>
        <label title="Attribute value (e.g., 'screen', 'true')">Value: <input type="text" name="${namePrefix}_value[${index}]"></label>
        <button type="button" class="remove-attribute" title="Remove this attribute">Remove</button>`;
    listElement.appendChild(attrRow);
    attrRow.querySelector('.remove-attribute').addEventListener('click', () => attrRow.remove());
}

/**
 * Adds a complete field row (code, prompt, type, style options, etc.) inside the textsettings container.
 * @param {HTMLElement} fieldsContainer - The container element holding the field rows.
 * @param {string} propertyPathPrefix - The name prefix of the parent property containing the textsettings.
 */
function addTextSettingFieldRow(fieldsContainer, propertyPathPrefix) {
    const fieldIndex = fieldsContainer.querySelectorAll(':scope > .field-row').length; // Use :scope
    const fieldRow = document.createElement("div");
    fieldRow.classList.add("field-row"); // Uses Flexbox from CSS

    const allowedSubTypes = Object.keys(BASE_TYPE_FIELDS).filter(t => !['group', 'grouplist', 'list', 'textsettings', 'fragment'].includes(t));
    const baseName = `${propertyPathPrefix}[fields][${fieldIndex}]`; // Base name path for this specific field

    // HTML structure for a single text setting field row, including style fields
    fieldRow.innerHTML = `
        <div class="property-field" title="Unique identifier for this setting (lowercase, numbers, underscores)."> <label>Code:</label> <div><input type="text" name="${baseName}[code]" required pattern="[a-z0-9_]+"></div> </div>
        <div class="property-field" title="Label shown for this setting in the Miva admin UI."> <label>Prompt:</label> <div><input type="text" name="${baseName}[prompt]" required></div> </div>
        <div class="property-field" title="Data type of the setting (e.g., text, number, checkbox)."> <label>Type:</label> <div><select name="${baseName}[type]">${allowedSubTypes.map((type) => `<option value="${type}">${type}</option>`).join("")}</select></div> </div>
        <div class="property-field" title="CSS property to target (e.g., font-size, color). Optional."> <label>Style Property:</label> <div><input type="text" name="${baseName}[style]" placeholder="e.g., font-size"></div> </div>
        <div class="property-field style-prefix-field" style="display: none;" title="Text to prepend..."> <label>Style Prefix:</label> <div><input type="text" name="${baseName}[style_prefix]" placeholder="e.g., calc("></div> </div>
        <div class="property-field style-suffix-field" style="display: none;" title="Text to append..."> <label>Style Suffix:</label> <div><input type="text" name="${baseName}[style_suffix]" placeholder="e.g., px + 1rem)"></div> </div>
        <div class="textsettings-options-container property-field full-width"></div>
        <div class="text-subtype-options-container property-field full-width" style="display: none;"></div>
        <button type="button" class="remove-field" title="Remove this text setting field">Remove Field</button>`;
    fieldsContainer.appendChild(fieldRow);

    // Get references and attach listeners for the new row
    const typeSelect = fieldRow.querySelector(`select[name$="[type]"]`);
    const optionsContainer = fieldRow.querySelector(".textsettings-options-container");
    const styleInput = fieldRow.querySelector(`input[name$="[style]"]`);
    const prefixFieldWrapper = fieldRow.querySelector(`.style-prefix-field`);
    const suffixFieldWrapper = fieldRow.querySelector(`.style-suffix-field`);

    // Listener to show/hide prefix/suffix based on style input
    if (styleInput && prefixFieldWrapper && suffixFieldWrapper) {
        styleInput.addEventListener('input', (event) => {
            const hasValue = event.target.value.trim() !== '';
            prefixFieldWrapper.style.display = hasValue ? 'grid' : 'none'; // Show as grid item
            suffixFieldWrapper.style.display = hasValue ? 'grid' : 'none'; // Show as grid item
        });
    }

    // Listener to render options based on the selected 'Type'
    typeSelect.addEventListener("change", () => {
        // Pass the parent property path prefix and the current field index
        renderTextSettingsOptions(optionsContainer, typeSelect.value, propertyPathPrefix, fieldIndex);
    });
    // Dispatch event AFTER the row is in the DOM and listeners are attached
    setTimeout(() => { if(typeSelect.isConnected) typeSelect.dispatchEvent(new Event("change")) }, 0);

    // Remove button listener
    fieldRow.querySelector(".remove-field").addEventListener("click", () => fieldRow.remove());
}

// **** THIS IS THE FUNCTION THAT WAS MISSING ****
/**
 * Renders the container and controls for a textsettings field within a property.
 * @param {HTMLElement} container - The parent element to append the textsettings UI to.
 * @param {string} propertyPathPrefix - The base name path for the property (e.g., "properties[0]").
 */
function renderTextSettingsField(container, propertyPathPrefix) {
    const textSettingsContainer = document.createElement("div");
    textSettingsContainer.classList.add("textsettings-container"); // Outer wrapper

    const enableWrapper = document.createElement('div'); // Wrapper for enable controls
    enableWrapper.classList.add('property-field', 'checkbox-field'); // Style like a checkbox field row
    enableWrapper.style.borderBottom = 'none'; // No line below the checkbox

    const enableTextSettingsCheckbox = document.createElement("input");
    enableTextSettingsCheckbox.type = "checkbox";
    // Generate a unique ID based on the property path
    const enableId = `enable-textsettings-${propertyPathPrefix}`.replace(/\[|\]/g, '-');
    enableTextSettingsCheckbox.id = enableId;
    enableTextSettingsCheckbox.name = `${propertyPathPrefix}[enable_textsettings]`; // Correct name
    enableTextSettingsCheckbox.value = "true";

    const enableTextSettingsLabel = document.createElement("label"); // Contains checkbox and text
    enableTextSettingsLabel.htmlFor = enableId;
    enableTextSettingsLabel.appendChild(enableTextSettingsCheckbox);
    enableTextSettingsLabel.appendChild(document.createTextNode(" Enable Text Settings"));
    enableTextSettingsLabel.title = "Check this to add configurable style settings (like font size, color) for this property.";

    const addFieldButton = document.createElement("button"); // Button to add fields
    addFieldButton.type = "button"; addFieldButton.textContent = "Add Another Field";
    addFieldButton.style.fontSize = "0.9em"; addFieldButton.style.padding = "5px 10px";
    addFieldButton.style.marginTop = '0'; addFieldButton.style.display = 'none'; // Hidden initially
    addFieldButton.style.marginLeft = 'auto'; // Push right

    // Assemble the enable controls line
    enableWrapper.appendChild(enableTextSettingsLabel);
    enableWrapper.appendChild(addFieldButton);
    textSettingsContainer.appendChild(enableWrapper);

    // Container for the actual text setting field rows
    const fieldsContainer = document.createElement("div");
    fieldsContainer.classList.add("fields-container");
    fieldsContainer.style.display = "none"; // Hidden initially
    textSettingsContainer.appendChild(fieldsContainer);

    // Event listener for the enable checkbox
    enableTextSettingsCheckbox.addEventListener("change", () => {
        const isChecked = enableTextSettingsCheckbox.checked;
        fieldsContainer.style.display = isChecked ? "block" : "none";
        addFieldButton.style.display = isChecked ? "inline-block" : "none";

        if (isChecked) {
             if (fieldsContainer.children.length === 0) {
                // Add the first field automatically when checked for the first time
                addTextSettingFieldRow(fieldsContainer, propertyPathPrefix);
            } else {
                // --- Re-render options for existing fields when re-enabled ---
                // This ensures listeners are attached and initial state is correct
                fieldsContainer.querySelectorAll('.field-row').forEach((fieldRow, fieldIndex) => {
                    const typeSelect = fieldRow.querySelector(`select[name$="[type]"]`);
                    const optionsContainer = fieldRow.querySelector(".textsettings-options-container");
                    if (typeSelect && optionsContainer) {
                         renderTextSettingsOptions(optionsContainer, typeSelect.value, propertyPathPrefix, fieldIndex);
                    }
                });
            }
        } else {
            fieldsContainer.innerHTML = ''; // Clear fields when unchecked
        }
    });

    // Event listener for the "Add Another Field" button
    addFieldButton.addEventListener("click", () => {
        addTextSettingFieldRow(fieldsContainer, propertyPathPrefix); // Just add a new row
    });

    container.appendChild(textSettingsContainer); // Add the whole textsettings UI to the parent
}
// **** END OF MISSING FUNCTION DEFINITION ****


// *** NEW Function: Render Responsive Images UI ***
/**
 * Renders the UI for adding responsive image definitions.
 * @param {HTMLElement} container - The parent element to append the UI to.
 * @param {string} propertyPathPrefix - The base name path for the parent image property (e.g., "properties[0]").
 */
function renderResponsiveImagesField(container, propertyPathPrefix) {
    const listContainer = document.createElement('div');
    listContainer.classList.add('responsive-images-list'); // For styling

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.textContent = 'Add Responsive Image Size';
    addButton.classList.add('btn-add-responsive');
    addButton.style.marginTop = '10px';

    addButton.addEventListener('click', () => {
        const index = listContainer.querySelectorAll('.responsive-image-row').length;
        const baseName = `${propertyPathPrefix}[responsive_images][${index}]`; // e.g., properties[0][responsive_images][0]

        const row = document.createElement('div');
        row.classList.add('responsive-image-row', 'field-row'); // Reuse field-row styles for layout

        row.innerHTML = `
            <div class="property-field" title="Code for this responsive size (e.g., 'mobile', 'tablet').">
                <label>Code:</label>
                <div><input type="text" name="${baseName}[code]" required pattern="[a-z0-9_]+"></div>
            </div>
            <div class="property-field" title="Label shown in UI for this size.">
                <label>Prompt:</label>
                <div><input type="text" name="${baseName}[prompt]" required></div>
            </div>
            <div class="property-field" title="Image width for this size (pixels).">
                <label>Width:</label>
                <div><input type="number" name="${baseName}[width]" min="1"></div>
            </div>
            <div class="property-field" title="Image height for this size (pixels).">
                <label>Height:</label>
                <div><input type="number" name="${baseName}[height]" min="1"></div>
            </div>
            <button type="button" class="remove-responsive-image" title="Remove this size">Remove Size</button>
        `;

        row.querySelector('.remove-responsive-image').addEventListener('click', () => row.remove());
        listContainer.appendChild(row); // Add the new row to the list container
    });

    container.appendChild(listContainer); // Add the list container first
    container.appendChild(addButton);    // Then add the button
}


// --- Define Render Function Map AFTER function definitions ---
const renderFunctionMap = {
    renderOptionsField,
    renderTextSettingsField,
    renderResponsiveImagesField // Add the new function here
};


// --- Process TYPE_FIELDS: Assign Render Functions ---
const TYPE_FIELDS = JSON.parse(JSON.stringify(BASE_TYPE_FIELDS)); // Deep copy needed

// Iterate and assign functions
for (const typeKey in TYPE_FIELDS) {
    if (Array.isArray(TYPE_FIELDS[typeKey])) {
        TYPE_FIELDS[typeKey].forEach(fieldConfig => {
            // Ensure fieldConfig is an object and has the renderFunctionName property
            if (fieldConfig && typeof fieldConfig === 'object' && fieldConfig.hasOwnProperty('renderFunctionName')) {
                const funcName = fieldConfig.renderFunctionName;
                // Check if the function exists in our map
                if (typeof renderFunctionMap[funcName] === 'function') {
                    fieldConfig.render = renderFunctionMap[funcName]; // Assign the actual function reference
                } else {
                    console.warn(`Render function "${funcName}" specified in config but not found in renderFunctionMap for field "${fieldConfig.name}" in type "${typeKey}".`);
                }
            }
        });
    }
}
// --- End TYPE_FIELDS Processing ---


// --- Recursive function to add a property row (top-level or nested) ---
function addPropertyRow(targetContainer, propertyPathPrefix = 'properties') {
    const currentIndex = targetContainer.querySelectorAll(':scope > .property-row').length;
    const currentPropertyPath = `${propertyPathPrefix}[${currentIndex}]`;

    const propertyRow = document.createElement("div");
    propertyRow.classList.add("property-row", "accordion-item");
    propertyRow.innerHTML = `
        <button class="accordion-header property-header" type="button">Property ${currentIndex}: (Type: text)</button>
        <div class="accordion-body">
            <div class="property-field" title="Select data type"><label>Type:</label><div><select name="${currentPropertyPath}[type]">${Object.keys(TYPE_FIELDS).map((type) => `<option value="${type}">${type}</option>`).join("")}</select></div></div>
             <div class="property-field" title="Unique code"><label>Code:</label><div><input type="text" name="${currentPropertyPath}[code]" required pattern="[a-z0-9_]+"></div></div>
            <div class="property-field" title="Admin label"><label>Prompt:</label><div><input type="text" name="${currentPropertyPath}[prompt]" required></div></div>
            <div class="property-options property-field full-width">
                 <div class="text-subtype-options-container-main" style="display: none;"></div>
                 <div class="child-properties-container" style="display: none; margin-top: 15px; padding-top: 15px; border-top: 1px dashed #ccc;"></div>
            </div>
            <button type="button" class="remove-property" title="Remove this property" style="background-color: #dc3545; margin-top: 15px; grid-column: 1 / -1;">Remove</button>
        </div>
    `;
    targetContainer.appendChild(propertyRow);
    propertyRow.classList.add('active'); // Start open

    const propertyTypeSelect = propertyRow.querySelector(`select[name$="[type]"]`);
    const propertyOptionsContainer = propertyRow.querySelector(".property-options");
    const propertyHeader = propertyRow.querySelector(".property-header");
    const propertyCodeInput = propertyRow.querySelector(`input[name$="[code]"]`);
    const childPropertiesContainer = propertyRow.querySelector(".child-properties-container");

    const updatePropertyHeader = () => {
        const type = propertyTypeSelect.value; const code = propertyCodeInput.value.trim();
        propertyHeader.textContent = `Property ${currentIndex}: ${code || '(No Code)'} (Type: ${type})`;
    };
    propertyTypeSelect.addEventListener('change', updatePropertyHeader);
    propertyCodeInput.addEventListener('input', updatePropertyHeader);
    updatePropertyHeader();

    // Listener to render dynamic fields when property type changes
    propertyTypeSelect.addEventListener("change", () => {
        const selectedType = propertyTypeSelect.value;
        const fields = TYPE_FIELDS[selectedType] || [];

        propertyOptionsContainer.querySelectorAll(':scope > .property-field:not(.text-subtype-options-container-main):not(.child-properties-container)').forEach(el => el.remove());
        const mainSubtypeContainer = propertyOptionsContainer.querySelector('.text-subtype-options-container-main');
        if (mainSubtypeContainer) { mainSubtypeContainer.innerHTML = ''; mainSubtypeContainer.style.display = 'none'; }
        childPropertiesContainer.innerHTML = ''; childPropertiesContainer.style.display = 'none';

        const standardFieldsFragment = document.createDocumentFragment();
        const textTypeFragment = document.createDocumentFragment();
        const complexFieldsFragment = document.createDocumentFragment();
        let textTypeSelectElement = null;

        fields.forEach((fieldConfig) => {
            const fieldName = typeof fieldConfig === 'string' ? fieldConfig : fieldConfig.name;
            if (['code', 'prompt', 'type', 'properties'].includes(fieldName)) return;
            if (selectedType === 'text' && ['placeholder', 'minlength', /* etc */].includes(fieldName)) return;

            const fieldDef = typeof fieldConfig === 'object' ? fieldConfig : { name: fieldName, type: 'text' };
            const fieldType = fieldDef.type || 'text';
            const inputName = `${currentPropertyPath}[${fieldName}]`;
            let labelText = fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_/g, ' ');
            const helpText = fieldDef.helpText || `Configure the ${labelText}.`;

            const fieldWrapper = document.createElement("div"); fieldWrapper.classList.add("property-field"); fieldWrapper.title = helpText;
            const labelElement = document.createElement('label'); labelElement.textContent = labelText;
            const controlContainer = document.createElement('div');
            let controlElement = null; let isComplex = false;

            if (fieldType === "boolean") {
                 fieldWrapper.classList.add("checkbox-field");
                 controlElement = document.createElement('input'); controlElement.type = 'checkbox'; controlElement.name = inputName; controlElement.value = 'true';
                 labelElement.textContent = ''; labelElement.appendChild(controlElement); labelElement.appendChild(document.createTextNode(` ${labelText}`));
                 fieldWrapper.appendChild(labelElement);
            } else if (fieldName === 'text_type' && fieldType === 'dropdown') {
                const optionsHtml = fieldDef.options.map(option => `<option value="${option.value}" ${option.value === fieldDef.default ? "selected" : ""}>${option.label}</option>`).join("");
                controlElement = document.createElement('select'); controlElement.name = inputName; controlElement.innerHTML = optionsHtml;
                textTypeSelectElement = controlElement;
            } else if (fieldType === "number") {
                controlElement = document.createElement('input'); controlElement.type = 'number'; controlElement.name = inputName; controlElement.placeholder = fieldDef.placeholder || '';
                if(fieldDef.step !== undefined) controlElement.step = fieldDef.step; if(fieldDef.min !== undefined) controlElement.min = fieldDef.min; if(fieldDef.max !== undefined) controlElement.max = fieldDef.max;
            } else if (fieldType === "dropdown" && fieldDef.options) {
                 let optionsHtml = fieldDef.options.map(option => `<option value="${option.value}" ${option.value === fieldDef.default ? "selected" : ""}>${option.label}</option>`).join("");
                 controlElement = document.createElement('select'); controlElement.name = inputName; controlElement.innerHTML = optionsHtml;
            } else if ((fieldType === "custom" || fieldType === "object") && typeof fieldDef.render === "function") { // Check typeof function
                 fieldWrapper.classList.add('full-width');
                 // Safely call render function
                 if (typeof fieldDef.render === 'function') {
                    fieldDef.render(controlContainer, currentPropertyPath);
                 } else {
                     console.warn(`Render function expected but not found for ${fieldName} in type ${selectedType}`);
                     controlContainer.textContent = `[Render Error]`;
                 }
                 controlElement = null; isComplex = true;
            } else if (fieldType === 'textarea') {
                 fieldWrapper.classList.add('full-width');
                 controlElement = document.createElement('textarea'); controlElement.name = inputName; controlElement.placeholder = fieldDef.placeholder || '';
            } else {
                controlElement = document.createElement('input'); controlElement.type = 'text'; controlElement.name = inputName; controlElement.placeholder = fieldDef.placeholder || '';
                if(fieldDef.required) controlElement.required = true;
            }

            if (fieldType !== 'boolean') { if (controlElement) { controlContainer.appendChild(controlElement); } fieldWrapper.appendChild(labelElement); fieldWrapper.appendChild(controlContainer); }

            if (fieldName === 'text_type') { textTypeFragment.appendChild(fieldWrapper); }
            else if (isComplex) { complexFieldsFragment.appendChild(fieldWrapper); }
            else if (fieldWrapper.hasChildNodes()){ standardFieldsFragment.appendChild(fieldWrapper); }
        });

        const insertTarget = propertyOptionsContainer.querySelector('.text-subtype-options-container-main');
        propertyOptionsContainer.insertBefore(standardFieldsFragment, insertTarget);
        if (textTypeFragment.hasChildNodes()) {
            propertyOptionsContainer.insertBefore(textTypeFragment, insertTarget);
            if (textTypeSelectElement) {
                 attachTextTypeListener(textTypeSelectElement, currentPropertyPath, null);
                 setTimeout(() => { if(textTypeSelectElement.isConnected) textTypeSelectElement.dispatchEvent(new Event('change')); }, 0);
            }
        }
        propertyOptionsContainer.appendChild(complexFieldsFragment);

        if (selectedType === 'group') {
            childPropertiesContainer.style.display = 'block';
            const addChildButton = document.createElement('button'); addChildButton.type = 'button'; addChildButton.textContent = 'Add Child Property'; addChildButton.style.marginTop = '10px';
            const childPropertyPathPrefix = `${currentPropertyPath}[properties]`;
            addChildButton.addEventListener('click', () => { addPropertyRow(childPropertiesContainer, childPropertyPathPrefix); });
            childPropertiesContainer.appendChild(addChildButton);
        }
    });

    propertyTypeSelect.dispatchEvent(new Event("change"));
    propertyRow.querySelector(".remove-property").addEventListener("click", () => propertyRow.remove());
}


// --- Build the main form UI Function (Defined AFTER TYPE_FIELDS is processed) ---
export function buildFormUI() {
    const formContainer = document.getElementById("form-content");
    // HTML Structure
    formContainer.innerHTML = `
    <div id="accordion">
      <div class="accordion-item active">
        <button class="accordion-header" type="button">Component Details</button>
        <div class="accordion-body">
          <div class="property-field" title="Component Name"><label>Component Name:</label><div><input type="text" name="component_name" value="My Component" required></div></div>
          <div class="property-field" title="Component Code"><label>Component Code:</label><div><input type="text" name="component_code" value="myComponent" required pattern="[a-z0-9\\-]+"></div></div>
          <div class="property-field" title="Version"><label>Version:</label><div><input type="text" name="version" value="1.0.0" required pattern="\\d+\\.\\d+\\.\\d+"></div></div>
          <div class="property-field" title="Component Type"><label>Component Type:</label><div><select name="type"><option value="component" selected>Component</option><option value="library">Library</option></select></div></div>
          <div class="property-field" title="Category"><label>Category:</label><div><select name="category"><option value="">-- Select Category --</option><option value="banner">Banner</option><option value="carousel">Carousel</option><option value="text">Text</option><option value="product">Product</option><option value="image">Image</option><option value="video">Video</option><option value="feature">Feature</option><option value="utility">Utility</option><option value="layout">Layout</option><option value="navigation">Navigation</option><option value="form">Form</option><option value="social">Social</option><option value="other">Other</option></select></div></div>
          <div class="property-field" title="Global Resource Code"><label>Global Resource Code:</label><div><input type="text" name="resourcegroup_code" value="myComponent" required></div></div>
          <div class="property-field full-width checkbox-field" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;" title="Include CSS?"><label><input type="checkbox" name="include_css" value="true"> Include CSS (<span class="filename-preview">...</span>)</label></div>
          <div id="css-attributes-container" style="display: none;" class="property-field full-width" title="CSS Attributes"><h4>CSS Attributes</h4><div id="css-attributes-list"></div><button type="button" id="add-css-attribute">Add CSS Attribute</button></div>
          <div class="property-field full-width checkbox-field" title="Include JS?"><label><input type="checkbox" name="include_js" value="true"> Include JS (<span class="filename-preview">...</span>)</label></div>
          <div id="js-attributes-container" style="display: none;" class="property-field full-width" title="JS Attributes"><h4>JS Attributes</h4><div id="js-attributes-list"></div><button type="button" id="add-js-attribute">Add JS Attribute</button></div>
        </div>
      </div>
      <div class="accordion-item">
        <button class="accordion-header" type="button">Properties</button>
        <div class="accordion-body" id="properties-accordion-body">
           <div id="properties-container"></div>
           <button id="add-property" type="button" style="margin-top: 15px;">Add Property</button>
        </div>
      </div>
    </div>
  `;

    // Get Element References
    const propertiesContainer = formContainer.querySelector("#properties-container");
    const addPropertyButton = formContainer.querySelector("#add-property");
    const componentCodeInput = formContainer.querySelector('input[name="component_code"]');
    const cssFilenamePreview = formContainer.querySelector('#css-filename-preview');
    const jsFilenamePreview = formContainer.querySelector('#js-filename-preview');
    const includeCSSCheckbox = formContainer.querySelector('input[name="include_css"]');
    const cssAttributesContainer = formContainer.querySelector('#css-attributes-container');
    const cssAttributesList = formContainer.querySelector('#css-attributes-list');
    const addCSSAttributeButton = formContainer.querySelector('#add-css-attribute');
    const includeJSCheckbox = formContainer.querySelector('input[name="include_js"]');
    const jsAttributesContainer = formContainer.querySelector('#js-attributes-container');
    const jsAttributesList = formContainer.querySelector('#js-attributes-list');
    const addJSAttributeButton = formContainer.querySelector('#add-js-attribute');

    // Setup Initial Event Listeners
    componentCodeInput.addEventListener('input', () => {
         const code = componentCodeInput.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') || 'component';
         if (cssFilenamePreview) cssFilenamePreview.textContent = `${code}.css`;
         if (jsFilenamePreview) jsFilenamePreview.textContent = `${code}.js`;
         const resourceCodeInput = formContainer.querySelector('input[name="resourcegroup_code"]');
         if (resourceCodeInput && (resourceCodeInput.value === 'myComponent' || resourceCodeInput.value === 'component')) { resourceCodeInput.value = code; }
    });
    componentCodeInput.dispatchEvent(new Event('input')); // Trigger initial update

    includeCSSCheckbox.addEventListener('change', () => { cssAttributesContainer.style.display = includeCSSCheckbox.checked ? 'block' : 'none'; });
    includeJSCheckbox.addEventListener('change', () => { jsAttributesContainer.style.display = includeJSCheckbox.checked ? 'block' : 'none'; });
    addCSSAttributeButton.addEventListener('click', () => addAttributeRow(cssAttributesList, 'css_attribute'));
    addJSAttributeButton.addEventListener('click', () => addAttributeRow(jsAttributesList, 'js_attribute'));

    // Properties Logic: Main button calls recursive function
    addPropertyButton.addEventListener("click", () => {
        addPropertyRow(propertiesContainer, 'properties'); // Start at top level
    });

} // --- End buildFormUI ---
