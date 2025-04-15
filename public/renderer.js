// renderer.js

// Import configuration and utilities
import { BASE_TYPE_FIELDS, getFieldsForTextSubType } from './config.js';
import { debounce } from './utils.js';

// --- Rendering Helper Functions ---

/**
 * Adds a row for configuring a custom lookup column.
 * @param {HTMLElement} columnsListContainer - The container (div) to append the column row to.
 * @param {string} lookupPathPrefix - The name prefix for the lookup object (e.g., "properties[0][lookup]").
 */
function addColumnRow(columnsListContainer, lookupPathPrefix) {
    const columnIndex = columnsListContainer.querySelectorAll(':scope > .column-row').length;
    const columnBasePath = `${lookupPathPrefix}[columns][${columnIndex}]`;

    const columnRow = document.createElement('div');
    columnRow.classList.add('column-row', 'field-row');

    const columnTypes = ['text', 'date', 'numeric', 'currency', 'imagepreview', 'mappedtextvalues', 'checkbox', 'datetime', 'serverdate', 'serverdatetime'];
    const typeOptions = columnTypes.map(t => `<option value="${t}">${t}</option>`).join('');

    columnRow.innerHTML = `
        <div class="property-field" title="Unique identifier for this column.">
            <label>Code:</label>
            <div><input type="text" name="${columnBasePath}[code]" required pattern="[a-z0-9_]+"></div>
        </div>
        <div class="property-field" title="Header text shown in the lookup table.">
            <label>Header:</label>
            <div><input type="text" name="${columnBasePath}[header]" required></div>
        </div>
        <div class="property-field" title="Data type for rendering and sorting.">
            <label>Type:</label>
            <div><select name="${columnBasePath}[type]">${typeOptions}</select></div>
        </div>
        <div class="property-field checkbox-field" title="Allow sorting by this column?">
            <label><input type="checkbox" name="${columnBasePath}[sortable]" value="true"> Sortable</label>
        </div>
        <div class="property-field checkbox-field" title="Allow searching in this column?">
            <label><input type="checkbox" name="${columnBasePath}[searchable]" value="true"> Searchable</label>
        </div>
        <button type="button" class="remove-column" title="Remove this column">Remove Column</button>
    `;

    columnsListContainer.appendChild(columnRow);

    columnRow.querySelector('.remove-column').addEventListener('click', () => {
        columnRow.remove();
        // Consider dispatching an event here if column changes need to affect defaults or preview
    });
}


/**
 * Renders the UI for the customlookup 'lookup' object configuration.
 * @param {HTMLElement} container - The parent element (likely a div inside .property-options).
 * @param {string} propertyPathPrefix - The base name path for the property (e.g., "properties[0]").
 */
function renderCustomLookupField(container, propertyPathPrefix) {
    const lookupPathPrefix = `${propertyPathPrefix}[lookup]`;
    const lookupContainer = document.createElement('div');
    lookupContainer.classList.add('custom-lookup-container'); // Add class for specific styling
    lookupContainer.style.marginTop = '15px';

    // Use a heading inside the container for better context
    lookupContainer.innerHTML = `
        <h4>Custom Lookup Configuration</h4>
        <div class="property-field" title="Miva module code containing the lookup function.">
            <label>Module Code:</label>
            <div><input type="text" name="${lookupPathPrefix}[module_code]" required></div>
        </div>
        <div class="property-field" title="Function within the module to call for data.">
            <label>Module Function:</label>
            <div><input type="text" name="${lookupPathPrefix}[module_function]" required></div>
        </div>
        <div class="property-field" title="Title for the modal window (optional, defaults to property prompt).">
            <label>Modal Title:</label>
            <div><input type="text" name="${lookupPathPrefix}[title]"></div>
        </div>
        <div class="property-field" title="Column code whose value is saved upon selection.">
            <label>Selection Column:</label>
            <div><input type="text" name="${lookupPathPrefix}[selection_column]" required pattern="[a-z0-9_]+"></div>
        </div>
        <div class="property-field" title="Column code to sort by default (optional).">
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
    container.appendChild(lookupContainer);

    const columnsList = lookupContainer.querySelector('.columns-list');
    const addColumnButton = lookupContainer.querySelector('.btn-add-column');
    addColumnButton.addEventListener('click', () => {
        addColumnRow(columnsList, lookupPathPrefix);
    });
}


/**
 * Renders the UI for adding text/value pairs (e.g., for select, radio).
 * Dispatches 'options-updated' event on the container when changes occur.
 * @param {HTMLElement} container - The parent element to append the options UI to.
 * @param {string} propertyPathPrefix - The base name path for the property or parent field.
 * @param {number|null} fieldIndex - The index if this is within a textsettings field, otherwise null.
 * @param {string|null} baseName - Optional override for the input name base path.
 */
function renderOptionsField(container, propertyPathPrefix, fieldIndex = null, baseName = null) {
    if (baseName === null) {
        baseName = (fieldIndex !== null)
            ? `${propertyPathPrefix}[fields][${fieldIndex}][options]`
            : `${propertyPathPrefix}[options]`;
    }
    const optionsContainer = document.createElement("div"); optionsContainer.classList.add("options-container");
    const addOptionButton = document.createElement("button"); addOptionButton.type = "button"; addOptionButton.textContent = "Add Option"; addOptionButton.classList.add('btn-add-option'); addOptionButton.style.marginTop = '5px';

    // Function to dispatch the update event
    const dispatchUpdate = debounce(() => {
        optionsContainer.dispatchEvent(new CustomEvent('options-updated', { bubbles: true, detail: { path: baseName } }));
    }, 100); // Debounce slightly

    addOptionButton.addEventListener("click", () => {
        const optionIndex = optionsContainer.querySelectorAll(':scope > .option-row').length;
        const optionRow = document.createElement("div"); optionRow.classList.add("option-row");
        optionRow.innerHTML = `<label>Text: <input type="text" name="${baseName}[${optionIndex}][text]" required></label><label>Value: <input type="text" name="${baseName}[${optionIndex}][value]" required></label><button type="button" class="remove-option">Remove</button>`;
        optionsContainer.insertBefore(optionRow, addOptionButton);
        optionRow.querySelector(".remove-option").addEventListener("click", () => {
            optionRow.remove();
            dispatchUpdate(); // Signal that options changed
        });
        dispatchUpdate(); // Signal that options changed
    });
    container.appendChild(optionsContainer); optionsContainer.appendChild(addOptionButton);

    // Listen for input changes within options as well using event delegation
    optionsContainer.addEventListener('input', (e) => {
        if (e.target.matches('input[name$="[text]"], input[name$="[value]"]')) {
             dispatchUpdate(); // Signal that options changed
        }
    });
}

/** Renders the specific configuration options for a given field type *within* a text setting. */
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
             fieldDef.render(controlWrapper, propertyPathPrefix, fieldIndex); // Call custom renderer
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

/** Renders the specific fields based on the selected text_type. */
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

/** Attaches the change event listener to a text_type select element. */
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

/** Adds a row for CSS/JS attribute input. */
function addAttributeRow(listElement, namePrefix) {
    const index = listElement.children.length;
    const attrRow = document.createElement('div');
    attrRow.innerHTML = `
        <label title="Attribute name (e.g., 'media', 'defer')">Name: <input type="text" name="${namePrefix}_name[${index}]"></label>
        <label title="Attribute value (e.g., 'screen', 'true')">Value: <input type="text" name="${namePrefix}_value[${index}]"></label>
        <button type="button" class="remove-attribute" title="Remove this attribute">Remove</button>`;
    listElement.appendChild(attrRow);
    attrRow.querySelector('.remove-attribute').addEventListener('click', () => attrRow.remove());
}

/** Adds a complete field row inside the textsettings container. */
function addTextSettingFieldRow(fieldsContainer, propertyPathPrefix) {
    const fieldIndex = fieldsContainer.querySelectorAll(':scope > .field-row').length;
    const fieldRow = document.createElement("div");
    fieldRow.classList.add("field-row");

    const allowedSubTypes = Object.keys(BASE_TYPE_FIELDS).filter(t => !['group', 'grouplist', 'list', 'textsettings', 'fragment'].includes(t));
    const baseName = `${propertyPathPrefix}[fields][${fieldIndex}]`;

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

    const typeSelect = fieldRow.querySelector(`select[name$="[type]"]`);
    const optionsContainer = fieldRow.querySelector(".textsettings-options-container");
    const styleInput = fieldRow.querySelector(`input[name$="[style]"]`);
    const prefixFieldWrapper = fieldRow.querySelector(`.style-prefix-field`);
    const suffixFieldWrapper = fieldRow.querySelector(`.style-suffix-field`);

    if (styleInput && prefixFieldWrapper && suffixFieldWrapper) {
        styleInput.addEventListener('input', (event) => {
            const hasValue = event.target.value.trim() !== '';
            prefixFieldWrapper.style.display = hasValue ? 'grid' : 'none';
            suffixFieldWrapper.style.display = hasValue ? 'grid' : 'none';
        });
         styleInput.dispatchEvent(new Event('input')); // Trigger initial check
    }

    typeSelect.addEventListener("change", () => {
        renderTextSettingsOptions(optionsContainer, typeSelect.value, propertyPathPrefix, fieldIndex);
    });
    setTimeout(() => { if(typeSelect.isConnected) typeSelect.dispatchEvent(new Event("change")) }, 0); // Trigger initial options render

    fieldRow.querySelector(".remove-field").addEventListener("click", () => fieldRow.remove());
}

/** Renders the container and controls for a textsettings field within a property. */
function renderTextSettingsField(container, propertyPathPrefix) {
    const textSettingsContainer = document.createElement("div");
    textSettingsContainer.classList.add("textsettings-container");

    const enableWrapper = document.createElement('div');
    enableWrapper.classList.add('property-field', 'checkbox-field');
    enableWrapper.style.borderBottom = 'none'; // Style adjustment

    const enableTextSettingsCheckbox = document.createElement("input");
    enableTextSettingsCheckbox.type = "checkbox";
    const enableId = `enable-textsettings-${propertyPathPrefix}`.replace(/\[|\]/g, '-');
    enableTextSettingsCheckbox.id = enableId;
    enableTextSettingsCheckbox.name = `${propertyPathPrefix}[enable_textsettings]`;
    enableTextSettingsCheckbox.value = "true";

    const enableTextSettingsLabel = document.createElement("label");
    enableTextSettingsLabel.htmlFor = enableId;
    enableTextSettingsLabel.appendChild(enableTextSettingsCheckbox);
    enableTextSettingsLabel.appendChild(document.createTextNode(" Enable Text Settings"));
    enableTextSettingsLabel.title = "Check this to add configurable style settings (like font size, color) for this property.";

    const addFieldButton = document.createElement("button");
    addFieldButton.type = "button"; addFieldButton.textContent = "Add Another Field";
    addFieldButton.style.fontSize = "0.9em"; addFieldButton.style.padding = "5px 10px";
    addFieldButton.style.marginTop = '0'; addFieldButton.style.display = 'none'; // Hidden initially
    addFieldButton.style.marginLeft = 'auto'; // Push right

    enableWrapper.appendChild(enableTextSettingsLabel);
    enableWrapper.appendChild(addFieldButton);
    textSettingsContainer.appendChild(enableWrapper);

    const fieldsContainer = document.createElement("div");
    fieldsContainer.classList.add("fields-container");
    fieldsContainer.style.display = "none"; // Hidden initially
    textSettingsContainer.appendChild(fieldsContainer);

    // Event listener for the enable checkbox
    enableTextSettingsCheckbox.addEventListener("change", () => {
        const isChecked = enableTextSettingsCheckbox.checked;
        fieldsContainer.style.display = isChecked ? "block" : "none";
        addFieldButton.style.display = isChecked ? "inline-block" : "none";

        if (isChecked && fieldsContainer.children.length === 0) {
            // Add the first field automatically when checked for the first time
            addTextSettingFieldRow(fieldsContainer, propertyPathPrefix);
        } else if (!isChecked) {
             fieldsContainer.innerHTML = ''; // Clear fields when unchecked
        }
        // No need to re-render existing fields when re-enabled, state is preserved
    });

    // Event listener for the "Add Another Field" button
    addFieldButton.addEventListener("click", () => {
        addTextSettingFieldRow(fieldsContainer, propertyPathPrefix);
    });

    container.appendChild(textSettingsContainer);
}

/** Renders the UI for adding responsive image definitions. */
function renderResponsiveImagesField(container, propertyPathPrefix) {
    const listContainer = document.createElement('div');
    listContainer.classList.add('responsive-images-list');

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.textContent = 'Add Responsive Image Size';
    addButton.classList.add('btn-add-responsive');
    addButton.style.marginTop = '10px';

    const dispatchUpdate = debounce(() => {
        // Signal that the responsive images definition changed
        listContainer.dispatchEvent(new CustomEvent('responsive-images-updated', { bubbles: true }));
    }, 150);

    addButton.addEventListener('click', () => {
        const index = listContainer.querySelectorAll(':scope > .responsive-image-row').length;
        const baseName = `${propertyPathPrefix}[responsive_images][${index}]`;

        const row = document.createElement('div');
        row.classList.add('responsive-image-row', 'field-row');

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

        row.querySelector('.remove-responsive-image').addEventListener('click', () => {
            row.remove();
            dispatchUpdate(); // Signal update after removal
        });
        listContainer.appendChild(row);
        dispatchUpdate(); // Signal update after adding
    });

    container.appendChild(listContainer);
    container.appendChild(addButton);

    // Listen for changes within existing responsive image inputs
     listContainer.addEventListener('input', (e) => {
         if (e.target.matches('input[name$="[code]"], input[name$="[prompt]"]')) {
             dispatchUpdate(); // Signal update on code/prompt change
         }
     });
}


// --- Define Render Function Map AFTER function definitions ---
const renderFunctionMap = {
    renderOptionsField,
    renderTextSettingsField,
    renderResponsiveImagesField,
    renderCustomLookupField
};

// --- Process TYPE_FIELDS: Assign Render Functions ---
const TYPE_FIELDS = JSON.parse(JSON.stringify(BASE_TYPE_FIELDS)); // Deep copy needed
for (const typeKey in TYPE_FIELDS) {
    if (Array.isArray(TYPE_FIELDS[typeKey])) {
        TYPE_FIELDS[typeKey].forEach(fieldConfig => {
            if (fieldConfig && typeof fieldConfig === 'object' && fieldConfig.hasOwnProperty('renderFunctionName')) {
                const funcName = fieldConfig.renderFunctionName;
                if (typeof renderFunctionMap[funcName] === 'function') {
                    fieldConfig.render = renderFunctionMap[funcName]; // Assign the actual function reference
                } else {
                    console.warn(`Render function "${funcName}" specified in config but not found for field "${fieldConfig.name}" in type "${typeKey}".`);
                }
            }
        });
    }
}
// --- End TYPE_FIELDS Processing ---


// --- Recursive function to add a property row (standard or advanced) ---
// Path prefix determines if it's 'properties' or 'advanced_properties'
function addPropertyRow(targetContainer, propertyPathPrefix) {
    const currentIndex = targetContainer.querySelectorAll(':scope > .property-row').length;
    const currentPropertyPath = `${propertyPathPrefix}[${currentIndex}]`;
    const isAdvanced = propertyPathPrefix.includes('advanced_properties'); // More robust check
    const propertyLabel = isAdvanced ? 'Advanced Property' : 'Property';

    const propertyRow = document.createElement("div");
    propertyRow.classList.add("property-row", "accordion-item");
    // Main structure - No default field here
    propertyRow.innerHTML = `
        <button class="accordion-header property-header" type="button">${propertyLabel} ${currentIndex}: (Type: text)</button>
        <div class="accordion-body">
            <div class="property-field" title="Select data type"><label>Type:</label><div><select name="${currentPropertyPath}[type]">${Object.keys(TYPE_FIELDS).map((type) => `<option value="${type}">${type}</option>`).join("")}</select></div></div>
             <div class="property-field" title="Unique code (lowercase, numbers, underscores)"><label>Code:</label><div><input type="text" name="${currentPropertyPath}[code]" required pattern="[a-z0-9_]+"></div></div>
            <div class="property-field" title="Admin label"><label>Prompt:</label><div><input type="text" name="${currentPropertyPath}[prompt]" required></div></div>
            <div class="property-options property-field full-width">
                 <!-- Container for type-specific options -->
                 <div class="text-subtype-options-container-main" style="display: none;"></div>
                 <div class="child-properties-container" style="display: none; margin-top: 15px; padding-top: 15px; border-top: 1px dashed #ccc;"></div>
            </div>
            <button type="button" class="remove-property" title="Remove this ${propertyLabel.toLowerCase()}" style="background-color: #dc3545; margin-top: 15px; grid-column: 1 / -1;">Remove</button>
        </div>
    `;
    targetContainer.appendChild(propertyRow);
    propertyRow.classList.add('active'); // Start open

    const propertyTypeSelect = propertyRow.querySelector(`select[name$="[type]"]`);
    const propertyOptionsContainer = propertyRow.querySelector(".property-options");
    const propertyHeader = propertyRow.querySelector(".property-header");
    const propertyCodeInput = propertyRow.querySelector(`input[name$="[code]"]`);
    const propertyPromptInput = propertyRow.querySelector(`input[name$="[prompt]"]`);
    const childPropertiesContainer = propertyRow.querySelector(".child-properties-container");

    const updatePropertyHeader = () => {
        const type = propertyTypeSelect.value; const code = propertyCodeInput.value.trim();
        propertyHeader.textContent = `${propertyLabel} ${currentIndex}: ${code || '(No Code)'} (Type: ${type})`;
    };
    propertyTypeSelect.addEventListener('change', updatePropertyHeader);
    propertyCodeInput.addEventListener('input', updatePropertyHeader);
    updatePropertyHeader(); // Initial call

    // Listener to render dynamic property-specific options
    propertyTypeSelect.addEventListener("change", () => {
        const selectedType = propertyTypeSelect.value;
        const fields = TYPE_FIELDS[selectedType] || [];

        // Clear previous options
        Array.from(propertyOptionsContainer.children).forEach(el => {
             if (!el.classList.contains('text-subtype-options-container-main') && !el.classList.contains('child-properties-container')) { el.remove(); }
        });
        const mainSubtypeContainer = propertyOptionsContainer.querySelector('.text-subtype-options-container-main');
        if (mainSubtypeContainer) { mainSubtypeContainer.innerHTML = ''; mainSubtypeContainer.style.display = 'none'; }
        childPropertiesContainer.innerHTML = ''; childPropertiesContainer.style.display = 'none';

        const standardFieldsFragment = document.createDocumentFragment();
        const textTypeFragment = document.createDocumentFragment();
        const complexFieldsFragment = document.createDocumentFragment();
        let textTypeSelectElement = null;

        fields.forEach((fieldConfig) => {
             const fieldName = typeof fieldConfig === 'string' ? fieldConfig : fieldConfig.name;
             if (['code', 'prompt', 'type', 'properties', 'group_fields'].includes(fieldName)) return;
             if (selectedType === 'text' && getFieldsForTextSubType('text').includes(fieldName)) return;

             const fieldDef = typeof fieldConfig === 'object' ? fieldConfig : { name: fieldName, type: 'text' };
             const fieldType = fieldDef.type || 'text';
             const inputName = `${currentPropertyPath}[${fieldName}]`;
             let labelText = fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_/g, ' ');
             const helpText = fieldDef.helpText || `Configure the ${labelText}.`;

             const fieldWrapper = document.createElement("div"); fieldWrapper.classList.add("property-field"); fieldWrapper.title = helpText;
             const labelElement = document.createElement('label'); labelElement.textContent = labelText;
             const controlContainer = document.createElement('div');
             let controlElement = null; let isComplex = false;

            // --- Render the control based on fieldType ---
            if (fieldType === "boolean") {
                 fieldWrapper.classList.add("checkbox-field");
                 controlElement = document.createElement('input'); controlElement.type = 'checkbox'; controlElement.name = inputName; controlElement.value = 'true';
                 labelElement.textContent = ''; labelElement.appendChild(controlElement); labelElement.appendChild(document.createTextNode(` ${labelText}`));
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
            } else if ((fieldType === "custom" || fieldType === "object") && typeof fieldDef.render === "function") {
                 fieldWrapper.classList.add('full-width'); isComplex = true;
                 fieldDef.render(controlContainer, currentPropertyPath); // Execute the render function
                 controlElement = null;
            } else if (fieldType === 'textarea') {
                 fieldWrapper.classList.add('full-width'); isComplex = true;
                 controlElement = document.createElement('textarea'); controlElement.name = inputName; controlElement.placeholder = fieldDef.placeholder || ''; controlElement.rows = 3;
            } else {
                controlElement = document.createElement('input'); controlElement.type = 'text'; controlElement.name = inputName; controlElement.placeholder = fieldDef.placeholder || '';
                if(fieldDef.required) controlElement.required = true;
            }

            // --- Assemble fieldWrapper and append to appropriate fragment ---
             if (fieldType === 'boolean') {
                 fieldWrapper.appendChild(labelElement); standardFieldsFragment.appendChild(fieldWrapper);
             } else {
                 if (controlElement) { controlContainer.appendChild(controlElement); }
                 fieldWrapper.appendChild(labelElement); fieldWrapper.appendChild(controlContainer);
                 if (fieldName === 'text_type') { textTypeFragment.appendChild(fieldWrapper); }
                 else if (isComplex) { complexFieldsFragment.appendChild(fieldWrapper); }
                 else { standardFieldsFragment.appendChild(fieldWrapper); }
             }
        }); // End forEach fieldConfig

        // --- Insert collected fragments into the DOM ---
        const insertTarget = propertyOptionsContainer.querySelector('.text-subtype-options-container-main');
        propertyOptionsContainer.insertBefore(standardFieldsFragment, insertTarget);
        if (textTypeFragment.hasChildNodes()) {
            propertyOptionsContainer.insertBefore(textTypeFragment, insertTarget);
            if (textTypeSelectElement) {
                 attachTextTypeListener(textTypeSelectElement, currentPropertyPath, null);
                 setTimeout(() => { if(textTypeSelectElement.isConnected) textTypeSelectElement.dispatchEvent(new Event('change')); }, 0);
            }
        }
        propertyOptionsContainer.insertBefore(complexFieldsFragment, insertTarget);

        // --- Render "Add Child Property" button if type is Group/List ---
        if (['group', 'list', 'grouplist'].includes(selectedType)) {
            childPropertiesContainer.style.display = 'block';
            const addChildButton = document.createElement('button');
            addChildButton.type = 'button'; addChildButton.textContent = 'Add Child Property'; addChildButton.style.marginTop = '10px';
            const childContainerKey = (selectedType === 'group') ? 'properties' : 'group_fields';
            // Ensure child prefix matches parent type (properties vs advanced_properties)
            const childPropertyPathPrefix = currentPropertyPath.replace(/\[\d+\]$/, `[${childContainerKey}]`); // Construct child path correctly
            addChildButton.addEventListener('click', () => {
                 addPropertyRow(childPropertiesContainer, childPropertyPathPrefix);
                 propertyRow.dispatchEvent(new CustomEvent('property-updated', { bubbles: true }));
             });
            childPropertiesContainer.appendChild(addChildButton);
        }

        // Signal update for Defaults section
        propertyRow.dispatchEvent(new CustomEvent('property-updated', { bubbles: true }));

    }); // End propertyTypeSelect change listener

    // Event listeners to signal updates for the defaults section
    propertyCodeInput.addEventListener('input', debounce(() => { propertyRow.dispatchEvent(new CustomEvent('property-updated', { bubbles: true })); }, 300));
    propertyPromptInput.addEventListener('input', debounce(() => { propertyRow.dispatchEvent(new CustomEvent('property-updated', { bubbles: true })); }, 300));
    propertyRow.addEventListener('options-updated', () => { propertyRow.dispatchEvent(new CustomEvent('property-updated', { bubbles: true })); });
    propertyRow.addEventListener('responsive-images-updated', () => { propertyRow.dispatchEvent(new CustomEvent('property-updated', { bubbles: true })); });


    propertyTypeSelect.dispatchEvent(new Event("change")); // Trigger initial render

    // Handle property removal
    propertyRow.querySelector(".remove-property").addEventListener("click", () => {
        const parent = propertyRow.parentElement;
        propertyRow.remove();
        parent.dispatchEvent(new CustomEvent('property-removed', { bubbles: true })); // Signal removal
    });
}


// --- Build the main form UI Function ---
export function buildFormUI() {
    const formContainer = document.getElementById("form-content");
    // Add "Advanced Properties" accordion item
    formContainer.innerHTML = `
    <div id="accordion">
      <div class="accordion-item active">
        <button class="accordion-header" type="button">Component Details</button>
        <div class="accordion-body">
          <div class="property-field" title="Component Name"><label>Component Name:</label><div><input type="text" name="component_name" value="My Component" required></div></div>
          <div class="property-field" title="Component Code (lowercase, numbers, hyphens)"><label>Component Code:</label><div><input type="text" name="component_code" value="my-component" required pattern="[a-z0-9\\-]+"></div></div>
          <div class="property-field" title="Version (e.g., 1.0.0)"><label>Version:</label><div><input type="text" name="version" value="1.0.0" required pattern="\\d+\\.\\d+\\.\\d+"></div></div>
          <div class="property-field" title="Component Type"><label>Component Type:</label><div><select name="type"><option value="component" selected>Component</option><option value="library">Library</option></select></div></div>
          <div class="property-field" title="Category (Optional)"><label>Category:</label><div><select name="category"><option value="">-- Select Category --</option><option value="banner">Banner</option><option value="carousel">Carousel</option><option value="text">Text</option><option value="product">Product</option><option value="image">Image</option><option value="video">Video</option><option value="feature">Feature</option><option value="utility">Utility</option><option value="layout">Layout</option><option value="navigation">Navigation</option><option value="form">Form</option><option value="social">Social</option><option value="other">Other</option></select></div></div>
          <div class="property-field" title="Resource Group Code (often same as Component Code)"><label>Global Resource Code:</label><div><input type="text" name="resourcegroup_code" value="my-component" required></div></div>
          <div class="property-field full-width checkbox-field" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;" title="Include CSS?"><label><input type="checkbox" name="include_css" value="true"> Include CSS (<span class="filename-preview css-filename">my-component.css</span>)</label></div>
          <div id="css-attributes-container" style="display: none;" class="property-field full-width attributes-section" title="CSS Attributes"><h4>CSS Attributes</h4><div id="css-attributes-list"></div><button type="button" id="add-css-attribute">Add CSS Attribute</button></div>
          <div class="property-field full-width checkbox-field" title="Include JS?"><label><input type="checkbox" name="include_js" value="true"> Include JS (<span class="filename-preview js-filename">my-component.js</span>)</label></div>
          <div id="js-attributes-container" style="display: none;" class="property-field full-width attributes-section" title="JS Attributes"><h4>JS Attributes</h4><div id="js-attributes-list"></div><button type="button" id="add-js-attribute">Add JS Attribute</button></div>
        </div>
      </div>
      <div class="accordion-item">
        <button class="accordion-header" type="button">Properties</button>
        <div class="accordion-body" id="properties-accordion-body">
           <div id="properties-container">
                <!-- Standard Property rows added here -->
           </div>
           <button id="add-property" type="button" style="margin-top: 15px;">Add Property</button>
        </div>
      </div>
      <div class="accordion-item">
         <button class="accordion-header" type="button">Advanced Properties</button>
         <div class="accordion-body" id="advanced-properties-accordion-body">
           <div id="advanced-properties-container">
             <p style="grid-column: 1 / -1; color: #666; margin-bottom: 15px;">Define less common or technical settings here. They will appear under an "Advanced" tab in Page Builder.</p>
             <!-- Advanced Property rows added here -->
           </div>
           <button id="add-advanced-property" type="button" style="margin-top: 15px;">Add Advanced Property</button>
         </div>
       </div>
      <div class="accordion-item">
         <button class="accordion-header" type="button">Defaults</button>
         <div class="accordion-body" id="defaults-accordion-body">
           <div id="defaults-container">
             <p style="grid-column: 1 / -1; color: #666; margin-bottom: 15px;">Set initial values for properties when the component is added. Changes to properties above will update this section.</p>
             <!-- Default value inputs dynamically added here -->
           </div>
         </div>
       </div>
    </div>
  `;

    // Get Element References
    const propertiesContainer = formContainer.querySelector("#properties-container");
    const addPropertyButton = formContainer.querySelector("#add-property");
    const advancedPropertiesContainer = formContainer.querySelector("#advanced-properties-container"); // New container
    const addAdvancedPropertyButton = formContainer.querySelector("#add-advanced-property"); // New button
    const defaultsContainer = formContainer.querySelector("#defaults-container");
    const componentCodeInput = formContainer.querySelector('input[name="component_code"]');
    const cssFilenamePreview = formContainer.querySelector('.filename-preview.css-filename');
    const jsFilenamePreview = formContainer.querySelector('.filename-preview.js-filename');
    const includeCSSCheckbox = formContainer.querySelector('input[name="include_css"]');
    const cssAttributesContainer = formContainer.querySelector('#css-attributes-container');
    const cssAttributesList = formContainer.querySelector('#css-attributes-list');
    const addCSSAttributeButton = formContainer.querySelector('#add-css-attribute');
    const includeJSCheckbox = formContainer.querySelector('input[name="include_js"]');
    const jsAttributesContainer = formContainer.querySelector('#js-attributes-container');
    const jsAttributesList = formContainer.querySelector('#js-attributes-list');
    const addJSAttributeButton = formContainer.querySelector('#add-js-attribute');

    // Setup Initial Event Listeners for Component Details
    componentCodeInput.addEventListener('input', debounce(() => {
         let code = componentCodeInput.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
         if (!code) code = 'component';
         componentCodeInput.value = code; // Sanitize input value
         if (cssFilenamePreview) cssFilenamePreview.textContent = `${code}.css`;
         if (jsFilenamePreview) jsFilenamePreview.textContent = `${code}.js`;
         const resourceCodeInput = formContainer.querySelector('input[name="resourcegroup_code"]');
         // Update resource code intelligently
         if (resourceCodeInput && (resourceCodeInput.value === 'my-component' || resourceCodeInput.value === 'component' || resourceCodeInput.value === componentCodeInput.dataset.previousCode)) {
            resourceCodeInput.value = code;
         }
         componentCodeInput.dataset.previousCode = code; // Store for next check
    }, 250));
    componentCodeInput.dispatchEvent(new Event('input')); // Initial update

    includeCSSCheckbox.addEventListener('change', () => { cssAttributesContainer.style.display = includeCSSCheckbox.checked ? 'block' : 'none'; });
    includeJSCheckbox.addEventListener('change', () => { jsAttributesContainer.style.display = includeJSCheckbox.checked ? 'block' : 'none'; });
    addCSSAttributeButton.addEventListener('click', () => addAttributeRow(cssAttributesList, 'css_attribute'));
    addJSAttributeButton.addEventListener('click', () => addAttributeRow(jsAttributesList, 'js_attribute'));


    // --- Helper function to render the default input for a single property ---
    /**
     * Renders the appropriate default input(s) for a given property, recursively for groups.
     * Handles both standard and advanced properties based on namePrefix structure.
     * @param {HTMLElement} container The container in the Defaults section to append to.
     * @param {HTMLElement} propertyRow The corresponding property row element from the Properties section.
     * @param {string} namePrefix The prefix for the input name (e.g., "defaults[prop_code]" or "defaults[advanced][adv_prop_code]").
     */
    function renderSingleDefault(container, propertyRow, namePrefix) {
        const typeSelect = propertyRow.querySelector(`select[name$="[type]"]`);
        const codeInput = propertyRow.querySelector(`input[name$="[code]"]`);
        const promptInput = propertyRow.querySelector(`input[name$="[prompt]"]`);
        const listTypeSelect = propertyRow.querySelector(`select[name$="[list_type]"]`); // For list type detection

        if (!typeSelect || !codeInput || !promptInput) return; // Need basic info

        const propertyType = typeSelect.value;
        const propertyCode = codeInput.value.trim();
        const propertyPrompt = promptInput.value.trim() || propertyCode;
        const isAdvanced = namePrefix.includes('[advanced]'); // Check if it's advanced

        if (!propertyCode) return; // Skip if no code

        // --- Types skipped in the flat default list ---
        const skipTypes = ['grouplist', 'textsettings', 'fragment']; // Group and List handled below
        if (skipTypes.includes(propertyType)) {
            return;
        }

        // --- Handle Group Recursively ---
        if (propertyType === 'group') {
            const groupDefaultsContainer = document.createElement('div');
            groupDefaultsContainer.classList.add('default-group-container');
            // Add a visual separator and heading for the group
            groupDefaultsContainer.innerHTML = `<h5 style="grid-column: 1 / -1; margin-top: 15px; margin-bottom: 8px; border-top: 1px dashed #ccc; padding-top: 15px; font-weight: bold;">Defaults for group '${propertyPrompt}':</h5>`;
            groupDefaultsContainer.style.display = 'contents'; // Let children be direct grid items of parent grid
            groupDefaultsContainer.style.gridColumn = '1 / -1'; // Group container spans full width

            let hasChildren = false;
            const childPropertiesContainer = propertyRow.querySelector('.child-properties-container');
            if (childPropertiesContainer) {
                childPropertiesContainer.querySelectorAll(':scope > .property-row').forEach(childRow => {
                    const childCodeInput = childRow.querySelector(`input[name$="[code]"]`);
                    if (childCodeInput && childCodeInput.value.trim()) {
                         const childCode = childCodeInput.value.trim();
                         // Recursive call for children, nested name structure
                         renderSingleDefault(groupDefaultsContainer, childRow, `${namePrefix}[children][${childCode}]`);
                         hasChildren = true;
                    }
                });
            }
             // Only append the group container if it has actual default fields rendered
            if (hasChildren) {
                 container.appendChild(groupDefaultsContainer);
            }
            return; // Group handled
        }

        // --- Handle List Types ---
        if (propertyType === 'list') {
            const listType = listTypeSelect ? listTypeSelect.value : 'text'; // Default to text if not specified

            if (listType === 'group') {
                // **UI Limitation:** Provide a placeholder. Complex array of objects default.
                const placeholder = document.createElement('div');
                placeholder.classList.add('default-entry', 'property-field', 'placeholder-message');
                placeholder.innerHTML = `<label>${propertyPrompt}:</label><div><em>Defaults for 'list:group' (array of groups) are not set in this simple UI.</em></div>`;
                container.appendChild(placeholder);
                return;
            } else {
                // Handle FLAT lists (text, color, product, etc.) using a textarea for comma-separated values.
                const defaultEntry = document.createElement('div');
                defaultEntry.classList.add('default-entry', 'property-field', 'full-width');
                const label = document.createElement('label');
                const inputId = `default-${propertyCode}-csv-${isAdvanced ? 'adv' : 'std'}`;
                label.htmlFor = inputId;
                label.textContent = `${propertyPrompt} (${listType} list):`;
                label.title = `Default values for list '${propertyCode}'. Enter comma-separated values.`;

                const controlContainer = document.createElement('div');
                const inputElement = document.createElement('textarea');
                inputElement.id = inputId;
                inputElement.rows = 2;
                inputElement.name = `${namePrefix}[value_csv]`; // Special name indication for backend
                inputElement.placeholder = `e.g., value1,value2,value3`;

                controlContainer.appendChild(inputElement);
                defaultEntry.appendChild(label);
                defaultEntry.appendChild(controlContainer);
                container.appendChild(defaultEntry);
                return; // List handled
            }
        }

        // --- Handle Standard / Simple / Newly Added Types ---
        const defaultEntry = document.createElement('div');
        defaultEntry.classList.add('default-entry', 'property-field'); // Use grid layout

        const label = document.createElement('label');
        const inputId = `default-${propertyCode}-${isAdvanced ? 'adv' : 'std'}`;
        label.htmlFor = inputId;
        label.textContent = `${propertyPrompt}:`; // Display property prompt
        label.title = `Default value for '${propertyCode}' (${propertyType})`;

        const controlContainer = document.createElement('div'); // Wrap input(s)
        let inputElement = null; // Main input element
        let inputName = `${namePrefix}[value]`; // Default name structure

        // Select input type based on propertyType
        switch (propertyType) {
            case 'checkbox':
                inputElement = document.createElement('select');
                inputElement.innerHTML = `<option value="">-- No Default --</option><option value="true">True</option><option value="false">False</option>`;
                break;
            case 'select':
            case 'radio':
            case 'selector':
                inputElement = document.createElement('select');
                let optionsHtml = '<option value="">-- No Default --</option>';
                const optionsContainer = propertyRow.querySelector('.options-container');
                if (optionsContainer) {
                    const options = Array.from(optionsContainer.querySelectorAll('.option-row'))
                        .map(row => {
                            const textInput = row.querySelector('input[name$="[text]"]');
                            const valueInput = row.querySelector('input[name$="[value]"]');
                            return (textInput?.value && valueInput?.value) ? { text: textInput.value.trim(), value: valueInput.value.trim() } : null;
                        })
                        .filter(opt => opt);
                    if (options.length > 0) { optionsHtml += options.map(opt => `<option value="${opt.value}">${opt.text}</option>`).join(''); }
                    else { optionsHtml += '<option value="" disabled>Define options first</option>'; inputElement.disabled = true; }
                } else { optionsHtml += '<option value="" disabled>Options not found</option>'; inputElement.disabled = true; }
                inputElement.innerHTML = optionsHtml;
                break;
            case 'number':
            case 'slider':
            case 'distributedslider':
                inputElement = document.createElement('input'); inputElement.type = 'number';
                inputElement.placeholder = "e.g., 10";
                break;
            case 'date':
                inputElement = document.createElement('input'); inputElement.type = 'date';
                break;
            case 'datetime':
                inputElement = document.createElement('input'); inputElement.type = 'text'; // Use text for easier ISO format input
                inputElement.placeholder = 'YYYY-MM-DDTHH:MM';
                break;
            case 'textarea':
                inputElement = document.createElement('textarea'); inputElement.rows = 2;
                inputElement.placeholder = "Enter default text";
                break;
             case 'texteditor': // Provide textarea for HTML default
                 inputElement = document.createElement('textarea'); inputElement.rows = 3;
                 inputElement.placeholder = "Enter default HTML content";
                 break;
            case 'color':
                 inputElement = document.createElement('input'); inputElement.type = 'color';
                 // Optionally add a text input companion
                 let colorTextInput = document.createElement('input');
                 colorTextInput.type = 'text';
                 colorTextInput.placeholder = '#RRGGBB';
                 colorTextInput.style.marginLeft = '10px';
                 colorTextInput.name = `${namePrefix}[value_text]`; // Use different name for preview if needed
                 // Basic sync logic
                 inputElement.addEventListener('input', () => colorTextInput.value = inputElement.value);
                 colorTextInput.addEventListener('input', () => {
                     if (/^#[0-9A-F]{6}$/i.test(colorTextInput.value)) { inputElement.value = colorTextInput.value; }
                 });
                 controlContainer.appendChild(inputElement);
                 controlContainer.appendChild(colorTextInput);
                 inputElement = null; // Flag that control was handled
                 break;
            case 'image':
                // Special handling for image with responsive defaults
                defaultEntry.classList.add('full-width'); // Use more space for image defaults
                label.textContent = `${propertyPrompt} (Image):`; // Clarify label
                controlContainer.style.display = 'flex';
                controlContainer.style.flexDirection = 'column';
                controlContainer.style.gap = '8px';

                // Main image input
                const mainImageInput = document.createElement('input');
                mainImageInput.type = 'text';
                mainImageInput.name = `${namePrefix}[value]`; // Name for the main image path
                mainImageInput.placeholder = "Default image path (e.g., graphics/001/img.jpg)";
                mainImageInput.style.marginBottom = '10px';
                controlContainer.appendChild(mainImageInput);

                // Responsive images inputs container
                const responsiveDefaultsContainer = document.createElement('div');
                responsiveDefaultsContainer.style.marginLeft = '15px'; // Indent responsive section
                responsiveDefaultsContainer.style.borderLeft = '2px solid #eee';
                responsiveDefaultsContainer.style.paddingLeft = '15px';

                const respHeading = document.createElement('label');
                respHeading.textContent = "Responsive Defaults:";
                respHeading.style.fontWeight = 'bold';
                respHeading.style.display = 'block'; // Ensure it's on its own line
                respHeading.style.marginBottom = '5px';
                responsiveDefaultsContainer.appendChild(respHeading);

                let hasResponsiveFields = false;
                // Find responsive fields defined in the property options
                const responsiveImagesList = propertyRow.querySelector('.responsive-images-list');
                if (responsiveImagesList) {
                    responsiveImagesList.querySelectorAll('.responsive-image-row').forEach(respRow => {
                        const respCodeInput = respRow.querySelector('input[name$="[code]"]');
                        const respPromptInput = respRow.querySelector('input[name$="[prompt]"]');
                        if (respCodeInput?.value.trim() && respPromptInput) {
                            hasResponsiveFields = true;
                            const respCode = respCodeInput.value.trim();
                            const respPrompt = respPromptInput.value.trim() || respCode;

                            const respDefaultWrapper = document.createElement('div');
                            respDefaultWrapper.classList.add('property-field', 'nested-default');

                            const respLabel = document.createElement('label');
                            const respInputId = `default-${propertyCode}-resp-${respCode}-${isAdvanced ? 'adv' : 'std'}`;
                            respLabel.htmlFor = respInputId;
                            respLabel.textContent = `${respPrompt} (${respCode}):`;

                            const respControlDiv = document.createElement('div');
                            const respInput = document.createElement('input');
                            respInput.type = 'text';
                            respInput.id = respInputId;
                            // Nested name structure: defaults[img_code][responsive_images][resp_code] or defaults[advanced][img_code]...
                            respInput.name = `${namePrefix}[responsive_images][${respCode}]`;
                            respInput.placeholder = `Path for ${respCode} size`;

                            respControlDiv.appendChild(respInput);
                            respDefaultWrapper.appendChild(respLabel);
                            respDefaultWrapper.appendChild(respControlDiv);
                            responsiveDefaultsContainer.appendChild(respDefaultWrapper);
                        }
                    });
                }

                if (hasResponsiveFields) {
                    controlContainer.appendChild(responsiveDefaultsContainer);
                } else {
                    const noRespMsg = document.createElement('em');
                    noRespMsg.textContent = '(No responsive sizes defined in property)';
                    noRespMsg.style.fontSize = '0.9em';
                    noRespMsg.style.color = '#777';
                    controlContainer.appendChild(noRespMsg);
                }

                inputElement = null; // Handled above
                break;

            // Types that just need a simple text input for their 'value'
            case 'imagetype':
            case 'link':
            case 'product':
            case 'category':
            case 'customlookup':
            case 'productcustomfieldlookup':
            case 'text': // Catches text, email, url, tel, etc.
            default:
                inputElement = document.createElement('input'); inputElement.type = 'text';
                inputElement.placeholder = `Enter default ${propertyType} value`;
                break;
        }

        // Append the main input element or the container with multiple controls
        if (inputElement) {
            inputElement.id = inputId;
            inputElement.name = inputName; // Assign the standard name
            controlContainer.appendChild(inputElement);
            defaultEntry.appendChild(label);
            defaultEntry.appendChild(controlContainer);
            container.appendChild(defaultEntry);
        } else if (controlContainer.childNodes.length > 0) {
             // If controls were added directly (e.g., image, color+text)
             defaultEntry.appendChild(label);
             defaultEntry.appendChild(controlContainer);
             container.appendChild(defaultEntry);
        }
    } // --- End renderSingleDefault ---


    // --- Function to populate the entire defaults section ---
    const populateDefaultsSection = debounce(() => {
        // --- Preserve existing values ---
        const existingDefaults = {};
        defaultsContainer.querySelectorAll('input, select, textarea').forEach(input => {
             if (input.name) {
                 // Store value based on input type for accurate restoration
                 existingDefaults[input.name] = (input.type === 'checkbox') ? input.checked
                                               : (input.tagName === 'SELECT' && input.value === 'true') ? true // Handle boolean select value
                                               : (input.tagName === 'SELECT' && input.value === 'false') ? false
                                               : input.value;
             }
         });
        // console.log("Preserved Defaults:", existingDefaults); // Debug

        // --- Clear and rebuild ---
        defaultsContainer.innerHTML = '<p style="grid-column: 1 / -1; color: #666; margin-bottom: 15px;">Set initial values for properties when the component is added. Changes to properties above will update this section.</p>';

        // --- Process Standard Properties ---
        let hasStandardDefaults = false;
        propertiesContainer.querySelectorAll(':scope > .property-row').forEach((propertyRow) => {
            const codeInput = propertyRow.querySelector(`input[name$="[code]"]`);
            if (codeInput && codeInput.value.trim()) {
                const propCode = codeInput.value.trim();
                // Start rendering defaults for standard properties
                renderSingleDefault(defaultsContainer, propertyRow, `defaults[${propCode}]`);
                hasStandardDefaults = true;
            }
        });
         if (!hasStandardDefaults && advancedPropertiesContainer.children.length === 0) { // Show only if NO properties exist at all
             const noStdMsg = document.createElement('em');
             noStdMsg.textContent = '(No properties defined yet)';
             noStdMsg.style.gridColumn = '1 / -1'; noStdMsg.style.color = '#777'; noStdMsg.style.fontSize = '0.9em';
             defaultsContainer.appendChild(noStdMsg);
         }


        // --- Process Advanced Properties ---
        const advancedDefaultsWrapper = document.createElement('div'); // Wrapper for visual separation
        advancedDefaultsWrapper.innerHTML = `<h4 style="grid-column: 1 / -1; margin-top: 20px; padding-top: 15px; border-top: 1px solid #ccc; margin-bottom: 10px;">Advanced Defaults</h4>`;
        advancedDefaultsWrapper.style.display = 'contents'; // Use parent grid
        advancedDefaultsWrapper.style.gridColumn = '1 / -1';

        let hasAdvancedProperties = false;
        let hasRenderedAdvancedDefaults = false; // Track if any default fields were actually rendered
        advancedPropertiesContainer.querySelectorAll(':scope > .property-row').forEach((propertyRow) => {
            const codeInput = propertyRow.querySelector(`input[name$="[code]"]`);
            if (codeInput && codeInput.value.trim()) {
                hasAdvancedProperties = true; // Mark that advanced props exist
                const propCode = codeInput.value.trim();
                 // IMPORTANT: Note the 'defaults[advanced][PROP_CODE]' prefix
                renderSingleDefault(advancedDefaultsWrapper, propertyRow, `defaults[advanced][${propCode}]`);
                // Check if renderSingleDefault actually added something to the wrapper
                if (advancedDefaultsWrapper.lastElementChild && advancedDefaultsWrapper.lastElementChild.classList.contains('default-entry')) {
                    hasRenderedAdvancedDefaults = true;
                }
            }
        });

        // Only add the "Advanced Defaults" section if there are advanced properties AND default fields were rendered for them
        if (hasAdvancedProperties && hasRenderedAdvancedDefaults) {
             defaultsContainer.appendChild(advancedDefaultsWrapper);
        } else if (hasAdvancedProperties && !hasRenderedAdvancedDefaults){
            // Optionally add a message if advanced props exist but none have defaults
             const noAdvMsg = document.createElement('em');
             noAdvMsg.textContent = '(No advanced properties eligible for simple defaults)';
             noAdvMsg.style.gridColumn = '1 / -1'; noAdvMsg.style.color = '#777'; noAdvMsg.style.fontSize = '0.9em';
             advancedDefaultsWrapper.appendChild(noAdvMsg); // Add message inside the wrapper
             defaultsContainer.appendChild(advancedDefaultsWrapper); // Still add the wrapper with heading
        }

        // --- Restore values ---
        Object.keys(existingDefaults).forEach(name => {
             const input = defaultsContainer.querySelector(`[name="${name}"]`);
             if (input) {
                 // Restore value based on input type and stored value type
                 const storedValue = existingDefaults[name];
                 if (input.tagName === 'SELECT') {
                     // Handle boolean select specifically
                     if (input.querySelector('option[value="true"]')) {
                         input.value = storedValue === true ? 'true' : storedValue === false ? 'false' : '';
                     } else if (Array.from(input.options).some(opt => opt.value === storedValue)) {
                         // For regular selects, restore if option exists
                         input.value = storedValue;
                     } else {
                         input.value = ""; // Fallback if value not found
                     }
                 } else if (input.type === 'checkbox') {
                      input.checked = !!storedValue; // Convert stored value to boolean for checked state
                 } else if (input.type === 'color' && typeof storedValue === 'string' && /^#[0-9A-F]{6}$/i.test(storedValue)) {
                      input.value = storedValue; // Restore color picker
                      // Also update companion text input if exists
                      const textInput = input.nextElementSibling; // Brittle assumption
                      if (textInput && textInput.tagName === 'INPUT' && textInput.type === 'text' && textInput.name === name.replace('[value]', '[value_text]')) {
                          textInput.value = storedValue;
                      }
                 } else {
                      input.value = storedValue ?? ''; // Restore other inputs (text, textarea, number, date, etc.), fallback to empty string
                 }
             }
         });

         // Special handling for color sync after restore
         defaultsContainer.querySelectorAll('input[type="color"]').forEach(colorPicker => {
              const textInput = colorPicker.nextElementSibling;
              if (textInput && textInput.tagName === 'INPUT' && textInput.type === 'text' && textInput.name.endsWith('[value_text]')) {
                  // If text has valid color, set picker. If picker has valid color, set text. Prioritize text input if both valid.
                  if (textInput.value && /^#[0-9A-F]{6}$/i.test(textInput.value)) {
                      colorPicker.value = textInput.value;
                  } else if (/^#[0-9A-F]{6}$/i.test(colorPicker.value)) {
                      textInput.value = colorPicker.value;
                  }
              }
         });


    }, 200); // Slightly increased debounce


    // --- Event Listeners ---
    // Add Property Button (Standard)
    addPropertyButton.addEventListener("click", () => {
        addPropertyRow(propertiesContainer, 'properties');
        // Defaults section updated via 'property-updated' event
    });
    // Add Advanced Property Button
    addAdvancedPropertyButton.addEventListener("click", () => {
        addPropertyRow(advancedPropertiesContainer, 'advanced_properties');
        // Defaults section updated via 'property-updated' event
    });

    // Listen for property updates/removals on BOTH containers
    propertiesContainer.addEventListener('property-updated', populateDefaultsSection);
    propertiesContainer.addEventListener('property-removed', populateDefaultsSection);
    advancedPropertiesContainer.addEventListener('property-updated', populateDefaultsSection);
    advancedPropertiesContainer.addEventListener('property-removed', populateDefaultsSection);

    // Initial population of defaults section on load
    populateDefaultsSection();

} // --- End buildFormUI ---
