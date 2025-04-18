// preview.js

// --- Imports ---
// Import field definitions used for processing properties and defaults.
import { BASE_TYPE_FIELDS } from "./config.js";

// --- Module State ---
// Stores the most recently generated JSON preview data object.
// This is accessible via getCurrentPreviewData().
let latestPreviewData = {};

// --- Helper Functions ---

/**
 * Parses the form data into a structured JavaScript object.
 * Handles nested structures like arrays and objects based on input names (e.g., properties[0][code]).
 * Cleans the resulting structure by removing undefined/null elements from arrays
 * and converting array-like objects ({ "0": val1, "1": val2 }) into actual arrays.
 * @param {HTMLFormElement} form - The form element to extract data from.
 * @returns {object} - A structured object representing the form data.
 */
function getStructuredFormData(form) {
    const formData = new FormData(form);
    const data = {}; // Initialize the root data object.

    // Iterate over each key-value pair in the FormData.
    formData.forEach((value, key) => {
        // Ignore entries with no key (shouldn't typically happen with standard form elements).
        if (!key) return;

        // Use regex to extract nested keys (e.g., "properties", "0", "code" from "properties[0][code]").
        const keys = key.match(/[^[\]]+/g);

        // If no brackets are found, it's a simple key-value pair.
        if (!keys) {
            data[key] = value;
            return;
        }

        // Navigate or create the nested structure based on the extracted keys.
        let current = data;
        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            const nextK = keys[i + 1];
            // Check if the *next* key is numeric to determine if the current level should be an array.
            const isNextKeyNumeric = /^\d+$/.test(nextK);

            // If the key doesn't exist at the current level, create it.
            if (!(k in current)) {
                current[k] = isNextKeyNumeric ? [] : {};
            }
            // If the next key is numeric but the current structure isn't an array, warn and overwrite.
            else if (isNextKeyNumeric && !Array.isArray(current[k])) {
                // console.warn(`Data structure conflict for key "${k}". Expected array, got object. Overwriting.`);
                current[k] = [];
            }
            // If the next key is *not* numeric but the current structure *is* an array, warn and convert to object.
            // This handles cases where array indices might be non-sequential initially.
            else if (!isNextKeyNumeric && Array.isArray(current[k])) {
                // console.warn(`Data structure conflict for key "${k}". Expected object, got array. Converting to object.`);
                const obj = {};
                current[k].forEach((item, index) => { obj[index] = item; });
                current[k] = obj;
            }
            // Move deeper into the structure.
            current = current[k];
        }

        // Handle the last key in the path.
        const lastKey = keys[keys.length - 1];
        const isLastKeyNumeric = /^\d+$/.test(lastKey);

        // If the last key is numeric and the current level is an array, assign value at the index.
        if (isLastKeyNumeric && Array.isArray(current)) {
            current[parseInt(lastKey, 10)] = value;
        }
        // If the current level is an object, assign the value using the last key.
        else if (typeof current === 'object' && !Array.isArray(current)) {
            current[lastKey] = value;
        }
        // Log a warning if the structure prevents assignment (should be rare).
        else {
             //console.warn(`Could not assign value for key path "${key}" to current structure:`, current);
        }
    });

    // Recursively clean the generated data structure.
    const cleanArrays = (obj) => {
        if (Array.isArray(obj)) {
            // Recursively clean array elements. Filter final array later.
            return obj.map(cleanArrays);
        } else if (typeof obj === "object" && obj !== null) {
            // Process object properties.
            const newObj = {};
            for (const key in obj) {
                // Ensure property belongs to the object and is not undefined (keep null for now).
                if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
                    newObj[key] = cleanArrays(obj[key]); // Recurse.
                }
            }

            // Check if the cleaned object looks like an array (all keys are numeric).
            const keys = Object.keys(newObj);
            const isArrayLike = keys.length > 0 && keys.every(k => /^\d+$/.test(k));

            if (isArrayLike) {
                // Convert the array-like object into a proper array.
                const arr = [];
                // Sort keys numerically to ensure correct order.
                keys.sort((a, b) => parseInt(a, 10) - parseInt(b, 10)).forEach(key => {
                    // Handle potential sparsity introduced during conversion.
                    arr[parseInt(key, 10)] = newObj[key];
                });
                 // Filter out undefined/null elements *from the final array*.
                return arr.filter(el => el !== undefined && el !== null);
            }
            // If not array-like, return the cleaned object.
            return newObj;
        }
        // Return primitive values directly.
        return obj;
    };

    // Apply the cleaning function to the initially parsed data.
    const cleanedData = cleanArrays(data);
    return cleanedData;
}


/**
 * Processes a single property's data from the raw form structure into the final JSON format.
 * Handles different property types, nested structures (groups, lists, textsettings),
 * data type conversions (boolean, number), and specific configurations (options, customlookup).
 * @param {object} sourceData - The raw data object for a single property from getStructuredFormData.
 * @param {object} definitions - The BASE_TYPE_FIELDS configuration object.
 * @param {boolean} [isInsideTextSettings=false] - Flag indicating if processing is within a textsettings field.
 * @returns {object|null} - The processed property object or null if input is invalid.
 */
function processPropertyData(sourceData, definitions, isInsideTextSettings = false) {
	// Basic validation for the source data object.
	if (!sourceData || typeof sourceData !== "object" || !sourceData.code || !sourceData.type) {
        console.warn("[Preview] processPropertyData: Invalid or incomplete source data provided, skipping.", sourceData);
		return null; // Return null if essential fields are missing.
	}

    // Initialize the target property object with core fields.
	const target = {
		code: String(sourceData.code).trim(), // Ensure code is a trimmed string.
		type: sourceData.type,
	};
    // Add prompt if it exists and is not empty.
    if (sourceData.prompt?.trim()) { target.prompt = sourceData.prompt.trim(); }

    // Get the field definitions specific to this property's type.
	const fieldDefinitions = definitions[target.type] || [];
    // Create a Map for efficient lookup of field definitions by name.
	const fieldDefinitionsMap = new Map(fieldDefinitions.map(fc => [
        typeof fc === 'string' ? fc : fc.name, // Key is the field name.
        typeof fc === 'string' ? { name: fc, type: 'text' } : fc // Value is the field definition object.
    ]));

    // Process standard fields based on the definitions found in BASE_TYPE_FIELDS.
	for (const fieldName in sourceData) {
        // Skip fields already handled (code, prompt, type) or processed specially later.
        // IMPORTANT: 'lookup' is skipped here because it's handled specifically for 'customlookup' type below.
		const skipFields = ["code", "prompt", "type", "properties", "group_fields", "fields", "enable_textsettings", "options", "responsive_images", "pseudoclasses", "lookup"];
		if (!sourceData.hasOwnProperty(fieldName) || skipFields.includes(fieldName)) continue;

		const value = sourceData[fieldName];
        // Skip empty or null values unless explicitly handled (like boolean 'false').
		if (value === undefined || value === null || value === "") continue;

        // Get the definition for the current field.
		const fieldDef = fieldDefinitionsMap.get(fieldName);
        // Determine the expected data type from the definition, defaulting to 'text'.
		const expectedType = fieldDef?.type || "text";

        // Convert and assign the value based on the expected type.
        if (expectedType === "boolean") {
            // Convert string "true" to boolean true. Other values are ignored (implicitly false).
            if (value === "true") { target[fieldName] = true; }
        } else if (expectedType === "number" ||
                   // Special case: Handle number-related attributes even for text inputs when text_type is 'number'.
                   (target.type === "text" && sourceData.text_type === "number" && ["min", "max", "step", "minlength", "maxlength"].includes(fieldName))) {
            const num = Number(value);
            // Only assign if the conversion is successful (not NaN).
            if (!isNaN(num)) { target[fieldName] = num; }
            else { console.warn(`[Preview] processPropertyData [${target.code}]: Invalid number value for '${fieldName}':`, value); }
        } else if (typeof value === 'string') {
            // Trim string values and assign only if not empty after trimming.
            const trimmed = value.trim();
            if (trimmed) { target[fieldName] = trimmed; }
        } else {
            // Assign other value types directly (e.g., could be objects if form structure allows).
            target[fieldName] = value;
        }
	}

    // Handle specific array/object structures based on field definitions.

    // Process 'options' (for select, radio, etc.).
    if (fieldDefinitionsMap.has("options") && sourceData.options && Array.isArray(sourceData.options)) {
        target.options = sourceData.options
            // Ensure each option has non-empty text and value.
            .map(opt => (opt?.text?.trim() && opt.value?.toString().trim() ? { text: opt.text.trim(), value: opt.value.toString().trim() } : null))
            .filter(opt => opt); // Filter out any null entries.
        // Remove the 'options' key if the resulting array is empty.
        if (target.options.length === 0) delete target.options;
    }

    // Process 'pseudoclasses' (for selector).
    if (fieldDefinitionsMap.has("pseudoclasses") && typeof sourceData.pseudoclasses === 'string') {
        target.pseudoclasses = sourceData.pseudoclasses.split(",") // Split comma-separated string.
            .map(v => v.trim()) // Trim whitespace.
            .filter(Boolean); // Remove empty strings.
        if (target.pseudoclasses.length === 0) delete target.pseudoclasses;
    }

    // Process 'responsive_images' (for image type).
    if (target.type === 'image' && sourceData.responsive_images && Array.isArray(sourceData.responsive_images)) {
        target.responsive_images = sourceData.responsive_images
            .map(imgData => {
                // Validate required fields for each responsive image entry.
                if (!imgData || !imgData.code?.trim() || !imgData.prompt?.trim()) return null;
                const entry = { code: imgData.code.trim(), prompt: imgData.prompt.trim() };
                // Add width/height if valid numbers are provided.
                const w = Number(imgData.width); if (!isNaN(w) && w > 0) entry.width = w;
                const h = Number(imgData.height); if (!isNaN(h) && h > 0) entry.height = h;
                return entry;
            })
            .filter(entry => entry); // Filter out null entries.
        if (target.responsive_images.length === 0) delete target.responsive_images;
    }

    // --- Dedicated processing for 'customlookup' type ---
    if (target.type === 'customlookup' && sourceData.lookup && typeof sourceData.lookup === 'object') {
        const lookupData = sourceData.lookup; // Source data for lookup config.
        const targetLookup = {}; // Initialize the target lookup object.

        // Copy and trim required/optional string fields for the lookup configuration.
        if (lookupData.module_code?.trim()) targetLookup.module_code = lookupData.module_code.trim();
        if (lookupData.module_function?.trim()) targetLookup.module_function = lookupData.module_function.trim();
        if (lookupData.selection_column?.trim()) targetLookup.selection_column = lookupData.selection_column.trim();
        if (lookupData.title?.trim()) targetLookup.title = lookupData.title.trim();
        if (lookupData.default_sort?.trim()) targetLookup.default_sort = lookupData.default_sort.trim();

        // Process the 'columns' array for the lookup modal.
        if (lookupData.columns && Array.isArray(lookupData.columns)) {
            targetLookup.columns = lookupData.columns
                .map(colData => {
                    // Validate required fields for each column definition.
                    if (!colData || !colData.code?.trim() || !colData.header?.trim() || !colData.type?.trim()) { return null; }
                    const col = { code: colData.code.trim(), header: colData.header.trim(), type: colData.type.trim() };
                    // Add boolean flags if 'true' string is present.
                    if (colData.sortable === 'true') col.sortable = true;
                    if (colData.searchable === 'true') col.searchable = true;
                    return col;
                })
                .filter(col => col !== null); // Filter out invalid column definitions.
            // Remove the 'columns' key if the array is empty.
            if (targetLookup.columns.length === 0) { delete targetLookup.columns; }
        }

        // Only add the 'lookup' object to the target property if all essential fields are present.
        if (targetLookup.module_code && targetLookup.module_function && targetLookup.selection_column && targetLookup.columns) {
            target.lookup = targetLookup;
        } else {
            // Warn if the lookup configuration is incomplete.
            // console.warn(`[Preview] processPropertyData [${target.code}]: Skipping incomplete lookup object. Required: module_code, module_function, selection_column, columns. Data:`, targetLookup);
        }
    }

    // --- Handle Nested Structures Recursively ---

    // Determine the key and source data for child properties based on the parent type.
    let childPropertiesKey = null;
    let childPropertiesSource = null;
    if (target.type === 'group') {
        childPropertiesKey = 'properties'; // Groups use 'properties'.
        childPropertiesSource = sourceData.properties;
    } else if (['list', 'grouplist'].includes(target.type)) {
        // Lists/Grouplists might use 'properties' or 'group_fields' depending on configuration.
        if (sourceData.properties && Array.isArray(sourceData.properties)) {
            childPropertiesKey = 'properties';
            childPropertiesSource = sourceData.properties;
        } else if (sourceData.group_fields && Array.isArray(sourceData.group_fields)) {
            // Note: Grouplist primarily uses 'group_fields', List can use 'properties' for list:group.
            childPropertiesKey = 'group_fields';
            childPropertiesSource = sourceData.group_fields;
        }
    }

    // Determine the source data for text settings fields.
    let textSettingsFields = null;
    // Check if text settings are enabled and field data exists.
    if (sourceData.enable_textsettings === 'true' && sourceData.fields && Array.isArray(sourceData.fields)) {
        textSettingsFields = sourceData.fields;
    }

    // Recurse for child properties if applicable.
    if (childPropertiesKey && childPropertiesSource && Array.isArray(childPropertiesSource)) {
        target[childPropertiesKey] = childPropertiesSource
            // Recursively call processPropertyData for each child.
            .map(childPropData => processPropertyData(childPropData, definitions, false))
            .filter(prop => prop !== null); // Filter out any invalid children.
        // Remove the key if no valid children were processed.
        if (target[childPropertiesKey].length === 0) { delete target[childPropertiesKey]; }
    }

    // Recurse for text settings fields if applicable.
    if (textSettingsFields) {
        target.textsettings = { // Create the textsettings object.
            fields: textSettingsFields
                // Recursively call processPropertyData for each field, marking it as inside textsettings.
                .map(fieldData => processPropertyData(fieldData, definitions, true))
                .filter(field => field !== null) // Filter out invalid fields.
        };
        // Remove the textsettings object if no valid fields were processed.
        if (target.textsettings.fields.length === 0) { delete target.textsettings; }
    }

    // Add style-related properties only if processing *inside* a textsettings field context.
    if (isInsideTextSettings) {
        if (sourceData.style?.trim()) {
            target.style = sourceData.style.trim(); // CSS property (e.g., font-size).
            // Optional prefix/suffix for the style value (e.g., 'calc(', 'px + 1rem)').
            if (sourceData.style_prefix?.trim()) { target.style_prefix = sourceData.style_prefix.trim(); }
            if (sourceData.style_suffix?.trim()) { target.style_suffix = sourceData.style_suffix.trim(); }
        }
     }

    // Return the fully processed property object.
	return target;
}


// --- Defaults Processing Logic ---

/**
 * Builds a flat map of all property and field definitions (including nested ones)
 * from the *generated* component structure (properties and advanced_properties arrays).
 * This map is crucial for validating and cleaning the defaults data.
 *
 * @param {object} componentPropertiesDefinition - The structure containing `properties` and `advanced_properties` arrays
 *                                                as generated by processing the form (e.g., `raw.properties`).
 * @returns {Map<string, object>} - A map where keys are property/field codes and values are their definition objects.
 *                                  Text setting fields have an added `isTextSettingField: true` property.
 */
function buildFullPropertyMap(componentPropertiesDefinition) {
    const map = new Map();

    // Recursive function to process properties at any level.
    function processLevel(properties) {
        if (!properties || !Array.isArray(properties)) return;

        properties.forEach(prop => {
            // Skip if property is invalid or lacks a code.
            if (!prop || !prop.code) return;

            // Warn if a code is duplicated (should ideally be unique).
            if (map.has(prop.code)) {
                console.warn(`[Defaults Build Map] Duplicate property code '${prop.code}'. Overwriting definition.`);
            }
            // Add the property definition to the map.
            map.set(prop.code, prop);

            // --- Recursion for Nested Structures ---
            // Check for child properties within groups ('properties') or lists/grouplists ('group_fields' or 'properties').
            const nestedProps = prop.properties || prop.group_fields;
            if (nestedProps && Array.isArray(nestedProps)) {
                processLevel(nestedProps); // Recurse into nested properties.
            }

            // --- Handle Text Settings Fields ---
            // If the property has text settings defined, add those fields to the map as well.
            if (prop.textsettings && prop.textsettings.fields && Array.isArray(prop.textsettings.fields)) {
                prop.textsettings.fields.forEach(settingField => {
                    if (settingField && settingField.code) {
                        // Create a map entry for the text setting field.
                        // Mark it specifically to differentiate from regular properties with the same code.
                        const mapEntry = { ...settingField, isTextSettingField: true };
                        if (map.has(settingField.code)) {
                            console.warn(`[Defaults Build Map] Duplicate text setting code '${settingField.code}'. Overwriting definition.`);
                        }
                        map.set(settingField.code, mapEntry);
                    }
                });
            }
        });
    }

    // Process both standard and advanced properties from the input definition.
    processLevel(componentPropertiesDefinition.properties);
    processLevel(componentPropertiesDefinition.advanced_properties);

    return map;
}

/**
 * Recursively cleans and validates a defaults data object based on property definitions.
 * Modifies the input object (`defaultsNode`) directly.
 * - Removes empty values (except for text/textarea/checkbox).
 * - Converts boolean/number values.
 * - Processes special list values (`value_csv`).
 * - Handles nested structures (groups, text settings).
 * - Removes keys that don't correspond to valid properties or settings.
 *
 * @param {object} defaultsNode - The current node (object) in the defaults data structure being processed.
 * @param {Map<string, object>} fullPropertyMap - The map of all property/field definitions generated by `buildFullPropertyMap`.
 * @param {string|null} [parentPropCode=null] - The code of the direct parent property (used for context, e.g., text settings).
 */
function cleanAndValidateDefaults(defaultsNode, fullPropertyMap, parentPropCode = null) {
    // Base case: If node is not an object, stop recursion.
    if (typeof defaultsNode !== 'object' || defaultsNode === null) {
        return;
    }

    // Get the definition of the parent property, if applicable.
    const parentPropDef = parentPropCode ? fullPropertyMap.get(parentPropCode) : null;

    // Iterate over the keys in the current defaults node.
    for (const key in defaultsNode) {
        if (!defaultsNode.hasOwnProperty(key)) continue; // Skip inherited properties.

        const value = defaultsNode[key]; // The data associated with the current key.
        const propDef = fullPropertyMap.get(key); // Check if the key matches a known property/field code.

        // --- Case 1: Key corresponds to a regular Property Code (not a text setting field) ---
        if (propDef && !propDef.isTextSettingField) {
            const propData = defaultsNode[key]; // This object holds default values like { value: ..., children: ... }

            // Validate the structure for the property default. It should be an object.
            if (typeof propData !== 'object' || propData === null) {
                 console.warn(`[cleanAndValidateDefaults] Invalid data structure for default property '${key}'. Expected object, got:`, propData);
                 delete defaultsNode[key]; // Remove invalid entry.
                 continue;
            }

            // 1a. Process 'value' (main default value) or 'value_csv' (for lists).
            if (propData.hasOwnProperty('value')) {
                let mainValue = propData.value;
                // Remove empty string values unless the property type allows empty strings (text, textarea, checkbox).
                if (mainValue === '' && !['text', 'textarea', 'texteditor', 'checkbox'].includes(propDef.type)) {
                    delete propData.value;
                }
                // Convert checkbox value ("true"/"false" string) to boolean.
                else if (propDef.type === 'checkbox') {
                    propData.value = (mainValue === 'true');
                }
                // Convert number-based type values to numbers.
                else if (['number', 'slider', 'distributedslider'].includes(propDef.type)) {
                    const num = Number(mainValue);
                    if (!isNaN(num)) { propData.value = num; }
                    else { delete propData.value; console.warn(`[Defaults] Invalid number default for ${key}: ${mainValue}`); }
                }
                // String values are kept as is (trimming happened in getStructuredFormData).
            } else if (propData.hasOwnProperty('value_csv') && propDef.type === 'list') {
                // Process comma-separated values for lists.
                 const csvValue = propData.value_csv?.trim();
                 if (csvValue) {
                    // Split, trim, and filter empty entries.
                    const arrayValue = csvValue.split(',').map(s => s.trim()).filter(s => s !== '');
                    // Determine the type of items expected in the list.
                    let listType = propDef.list_type || 'text';
                    let convertedArray = arrayValue;
                    // Convert array elements if list_type is number or boolean.
                    if (listType === 'number') { convertedArray = arrayValue.map(Number).filter(n => !isNaN(n)); }
                    else if (listType === 'boolean') { convertedArray = arrayValue.map(v => v.toLowerCase() === 'true'); }

                    // If conversion resulted in a non-empty array, replace 'value_csv' with 'value'.
                    if (convertedArray.length > 0) {
                         propData.value = convertedArray;
                    }
                 }
                 delete propData.value_csv; // Always remove the temporary 'value_csv' key.
            }

            // 1b. Process 'responsive_images' defaults (paths keyed by responsive code).
            if (propData.responsive_images) {
                // Ensure it's an object and not empty.
                if (typeof propData.responsive_images !== 'object' || Array.isArray(propData.responsive_images) || Object.keys(propData.responsive_images).length === 0) {
                    // console.warn(`[cleanAndValidateDefaults] Invalid or empty 'responsive_images' structure for '${key}'.`);
                    delete propData.responsive_images;
                } else {
                    // Trim paths and remove empty ones within the responsive_images object.
                    for(const respKey in propData.responsive_images) {
                        if(typeof propData.responsive_images[respKey] === 'string') {
                             propData.responsive_images[respKey] = propData.responsive_images[respKey].trim();
                             if (!propData.responsive_images[respKey]) delete propData.responsive_images[respKey]; // Remove empty path.
                        } else {
                            delete propData.responsive_images[respKey]; // Remove non-string values.
                        }
                    }
                    // Clean up again if all paths became empty.
                    if (Object.keys(propData.responsive_images).length === 0) delete propData.responsive_images;
                }
            }

            // 1c. Process 'textsettings' defaults recursively.
            if (propData.textsettings) {
                if (typeof propData.textsettings === 'object' && !Array.isArray(propData.textsettings)) {
                    // Recurse into the textsettings object. Pass the current property code as the parent context.
                    cleanAndValidateDefaults(propData.textsettings, fullPropertyMap, key);
                    // Remove the textsettings object if it becomes empty after cleaning.
                    if (Object.keys(propData.textsettings).length === 0) { delete propData.textsettings; }
                } else {
                    console.warn(`[cleanAndValidateDefaults] Invalid 'textsettings' structure for '${key}'. Expected object.`);
                    delete propData.textsettings;
                }
            }

            // 1d. Process 'children' defaults for Group properties recursively.
            if (propData.children && propDef.type === 'group') {
                 if (typeof propData.children === 'object' && !Array.isArray(propData.children)) {
                    // Recurse into the children object. Pass the current group property code as the parent context.
                    cleanAndValidateDefaults(propData.children, fullPropertyMap, key);
                    // Remove the children object if it becomes empty.
                    if (Object.keys(propData.children).length === 0) { delete propData.children; }
                 } else {
                     console.warn(`[cleanAndValidateDefaults] Invalid 'children' structure for group '${key}'. Expected object.`);
                     delete propData.children;
                 }
            }

            // 1e. Clean up the property default object itself if it's now empty.
             if (Object.keys(propData).length === 0) {
                 delete defaultsNode[key];
             }
        }

        // --- Case 2: Key is within a 'textsettings' object AND is NOT 'value' ---
        // This means the key likely represents a *pseudo-class* ('normal', 'hover', etc.)
        // or a *text setting field code*.
        else if (parentPropDef?.textsettings && key !== 'value') {
            const textSettingOrPseudoClassData = defaultsNode[key]; // Data for the field or pseudo-class.

            // 2a. Check if the key IS a Text Setting Field Code defined in the map.
            const fieldDef = fullPropertyMap.get(key);
            if (fieldDef?.isTextSettingField) {
                // Process the default value for this specific text setting field.
                // Expect structure like { value: ... } from the form.
                if (typeof textSettingOrPseudoClassData === 'object' && textSettingOrPseudoClassData !== null && textSettingOrPseudoClassData.hasOwnProperty('value')) {
                    let settingValue = textSettingOrPseudoClassData.value;
                    // Remove empty string values unless the type allows them.
                    if (settingValue === '' && !['text', 'textarea', 'texteditor', 'checkbox'].includes(fieldDef.type)) {
                         delete defaultsNode[key]; // Remove the { value: "" } object.
                    }
                    // Convert checkbox value to boolean and replace the { value: "true" } object.
                    else if (fieldDef.type === 'checkbox') {
                         defaultsNode[key] = (settingValue === 'true');
                    }
                    // Convert number value and replace the { value: "123" } object.
                    else if (['number', 'slider', 'distributedslider'].includes(fieldDef.type)) {
                         const num = Number(settingValue);
                         if (!isNaN(num)) { defaultsNode[key] = num; }
                         else { delete defaultsNode[key]; console.warn(`[Defaults] Invalid number default for text setting ${key}: ${settingValue}`); }
                    }
                    // For text types, replace the { value: "..." } object with the string value itself.
                    else {
                         defaultsNode[key] = settingValue;
                    }
                } else {
                    // If the structure is not { value: ... }, it's invalid for a text setting field default.
                     console.warn(`[cleanAndValidateDefaults] Invalid data for text setting field '${key}'. Expected { value: ... }, got:`, textSettingOrPseudoClassData);
                     delete defaultsNode[key]; // Remove invalid entry.
                }
            }
             // 2b. If the key is NOT a text setting field code, assume it's a pseudo-class (like 'hover').
            else if (typeof textSettingOrPseudoClassData === 'object' && textSettingOrPseudoClassData !== null) {
                 // Recurse into the pseudo-class object to process its fields.
                 // Keep the same parentPropCode context (the property owning the textsettings).
                 cleanAndValidateDefaults(textSettingOrPseudoClassData, fullPropertyMap, parentPropCode);
                 // Remove the pseudo-class object if it becomes empty.
                 if (Object.keys(textSettingOrPseudoClassData).length === 0) { delete defaultsNode[key]; }
            }
            // 2c. If it's neither a known field nor an object, remove it.
            else {
                console.warn(`[cleanAndValidateDefaults] Invalid data for potential pseudo-class or unknown key '${key}' in textsettings of '${parentPropCode}'. Data:`, textSettingOrPseudoClassData);
                delete defaultsNode[key];
            }
        }

        // --- Case 3: Key is within a 'children' object (of a Group) AND is NOT 'value' ---
        // This means the key is likely a child property code.
        else if (parentPropDef?.type === 'group' && key !== 'value') {
            const childData = defaultsNode[key]; // The default data for the child property.
            // Ensure the child data is an object before recursing.
            if (typeof childData === 'object' && childData !== null) {
                // Recurse into the child property's default data.
                // Use the child's property code (`key`) as the new parent context for the next level.
                cleanAndValidateDefaults(defaultsNode[key], fullPropertyMap, key);
                // Remove the child default entry if it becomes empty after cleaning.
                if (Object.keys(defaultsNode[key]).length === 0) { delete defaultsNode[key]; }
            } else {
                 console.warn(`[cleanAndValidateDefaults] Invalid data structure for child property '${key}' in group '${parentPropCode}'. Expected object, got:`, childData);
                 delete defaultsNode[key];
            }
        }
         // --- Case 4: Key doesn't match any known property, text setting, or nested structure context ---
         // This could be leftover data from the raw form parsing or an unexpected key.
         // We implicitly ignore/skip these keys as they don't fit the expected structure.
    }
}


/**
 * Processes the raw defaults data extracted from the form into the final, clean defaults object.
 * Orchestrates the building of the property map and the recursive cleaning process.
 *
 * @param {object} sourceDefaultsData - The raw 'defaults' object from getStructuredFormData.
 *                                      May contain standard defaults directly and advanced defaults under an 'advanced' key.
 * @param {object} componentPropertiesDefinition - The *processed* component properties structure
 *                                                (containing `properties` and `advanced_properties` arrays)
 *                                                needed to build the validation map.
 * @returns {object} - The cleaned and validated defaults object ready for the final JSON preview.
 */
function processDefaultsPreview(sourceDefaultsData, componentPropertiesDefinition) {
    // Handle cases where no defaults data is provided.
    if (!sourceDefaultsData || typeof sourceDefaultsData !== 'object') {
        return {};
    }

    // 1. Build the flat map of all property/field definitions based on the *current* form state.
    // This ensures defaults are validated against the properties as they are defined in the UI *now*.
    const fullPropertyMap = buildFullPropertyMap(componentPropertiesDefinition);

    // 2. Create a deep copy of the source data to avoid modifying the original structure
    // returned by getStructuredFormData, as cleanAndValidateDefaults modifies in place.
    const cleanedDefaults = JSON.parse(JSON.stringify(sourceDefaultsData));

    // 3. Separate advanced defaults if they exist under the 'advanced' key.
    const advancedDefaults = cleanedDefaults.advanced || {};
    delete cleanedDefaults.advanced; // Remove the 'advanced' key from the main object.

    // 4. Clean and validate the standard defaults (now the top-level keys in cleanedDefaults).
    cleanAndValidateDefaults(cleanedDefaults, fullPropertyMap);

    // 5. Clean and validate the advanced defaults separately.
    cleanAndValidateDefaults(advancedDefaults, fullPropertyMap);

    // 6. Merge the cleaned advanced defaults back into the main defaults object.
    // In the final JSON, advanced property defaults live at the same level as standard ones.
    for (const key in advancedDefaults) {
        if (advancedDefaults.hasOwnProperty(key)) {
             // Warn if a property code exists in both standard and advanced sections (should be rare).
             if (cleanedDefaults.hasOwnProperty(key)) {
                 console.warn(`[Defaults Merge] Property code '${key}' exists in both standard and advanced defaults. Advanced value will overwrite.`);
             }
             // Add/overwrite the property in the main defaults object.
             cleanedDefaults[key] = advancedDefaults[key];
        }
    }

    // Return the final, merged, and cleaned defaults object.
    return cleanedDefaults;
}


// --- Main Preview Setup ---

/**
 * Sets up the live JSON preview functionality.
 * Attaches event listeners to the form to trigger preview updates.
 * Uses debouncing to limit the frequency of preview generation.
 * @returns {Function} - The debounced function that updates the preview.
 */
export function setupPreview() {
    // Get references to the form and the preview container element.
    const form = document.querySelector("form");
    const previewContainer = document.getElementById("json-preview");

    // Basic check for essential elements.
    if (!form || !previewContainer) {
        console.error("[Preview] setupPreview: Form or Preview Container not found! Preview will not function.");
        return () => {}; // Return a no-op function if setup fails.
    }

    // Debounce function: Ensures the preview update logic doesn't run excessively
    // on every single input change, but rather after a short pause in user activity.
    function debounce(func, delay) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId); // Reset timer on each call.
            timeoutId = setTimeout(() => {
                func.apply(this, args); // Execute the function after the delay.
            }, delay);
        };
    }

    // The core function that generates and displays the JSON preview.
    const updatePreviewInternal = debounce(() => {
        // 1. Get the current form data in a structured format.
        const formData = getStructuredFormData(form);

        // 2. Initialize the raw preview object (`raw`).
        const raw = {};

        // 3. --- Process Top-level component fields ---
        raw.code = formData.component_code?.trim() || ''; // Use empty string as default.
        raw.name = formData.component_name?.trim() || '';
        raw.version = formData.version?.trim() || '';
        raw.type = formData.type || 'component'; // Default to 'component'.
        if (formData.category?.trim()) { raw.category = formData.category.trim(); } // Optional category.
        raw.resourcegroup_code = formData.resourcegroup_code?.trim() || '';
        // Define standard template paths (assuming a fixed structure).
        raw.initialization_template = `src/templates/init.mvt`;
        raw.instance_template = `src/templates/instance.mvt`;

        // 4. --- Process Styles & Scripts ---
        raw.styles = [];
        // If the 'include_css' checkbox is checked...
        if (formData.include_css === 'true') {
            const cssAttributes = [];
            // Collect CSS link attributes (name/value pairs). Handle potential single vs multiple values.
            const names = formData.css_attribute_name ? [].concat(formData.css_attribute_name) : [];
            const values = formData.css_attribute_value ? [].concat(formData.css_attribute_value) : [];
            // Iterate based on the longer array to capture all pairs.
            for(let i = 0; i < Math.max(names.length, values.length); i++) {
                // Only add attribute if both name and value are non-empty.
                if (names[i]?.trim() && values[i]?.trim()) {
                    cssAttributes.push({ name: names[i].trim(), value: values[i].trim() });
                }
            }
            // Add the style entry to the 'styles' array.
            raw.styles.push({
                filepath: `src/css/${raw.code || 'component'}.css`, // Construct path using component code.
                resource_code: raw.resourcegroup_code, // Link to the resource group.
                // Conditionally add the 'attributes' array if it's not empty.
                ...(cssAttributes.length > 0 && { attributes: cssAttributes }),
            });
        }
        raw.scripts = [];
         // If the 'include_js' checkbox is checked...
        if (formData.include_js === 'true') {
            const jsAttributes = [];
            // Collect JS script tag attributes similarly to CSS.
             const names = formData.js_attribute_name ? [].concat(formData.js_attribute_name) : [];
             const values = formData.js_attribute_value ? [].concat(formData.js_attribute_value) : [];
             for(let i = 0; i < Math.max(names.length, values.length); i++) {
                 if (names[i]?.trim() && values[i]?.trim()) {
                     jsAttributes.push({ name: names[i].trim(), value: values[i].trim() });
                 }
             }
            // Add the script entry to the 'scripts' array.
            raw.scripts.push({
                filepath: `src/js/${raw.code || 'component'}.js`,
                resource_code: raw.resourcegroup_code,
                ...(jsAttributes.length > 0 && { attributes: jsAttributes }),
            });
        }
        // Remove the 'styles' or 'scripts' keys entirely if their arrays are empty.
        if (raw.styles.length === 0) delete raw.styles;
        if (raw.scripts.length === 0) delete raw.scripts;

        // 5. --- Process Properties (Standard and Advanced) ---
        // Use the `processPropertyData` helper for each property defined in the form data.
        // This converts the raw form input for each property into the final JSON structure.
        raw.properties = (formData.properties && Array.isArray(formData.properties))
            ? formData.properties
                  .map(propData => processPropertyData(propData, BASE_TYPE_FIELDS, false)) // Process each standard property.
                  .filter(p => p) // Filter out any null results (invalid properties).
            : []; // Default to empty array if no properties data.

        raw.advanced_properties = (formData.advanced_properties && Array.isArray(formData.advanced_properties))
            ? formData.advanced_properties
                  .map(propData => processPropertyData(propData, BASE_TYPE_FIELDS, false)) // Process each advanced property.
                  .filter(p => p) // Filter out nulls.
            : []; // Default to empty array.

        // Remove the keys if the resulting arrays are empty.
        if (raw.properties.length === 0) delete raw.properties;
        if (raw.advanced_properties.length === 0) delete raw.advanced_properties;


        // 6. --- Process Defaults ---
        // Define the structure expected by `processDefaultsPreview`, containing the *just generated* property definitions.
        const componentPropertiesForDefaults = {
            properties: raw.properties || [],
            advanced_properties: raw.advanced_properties || []
        };
        // Process the 'defaults' section of the structured form data, using the generated property definitions for validation.
        raw.defaults = processDefaultsPreview(formData.defaults, componentPropertiesForDefaults);

        // Remove the 'defaults' key if the resulting object is empty.
        if (raw.defaults && Object.keys(raw.defaults).length === 0) {
            delete raw.defaults;
        }

        // 7. --- Store and Display the Final JSON ---
        // Store the fully generated `raw` object in the module-level variable.
        latestPreviewData = raw;

        // Update the content of the JSON preview <pre> tag.
        try {
            // Convert the final `raw` object to a formatted JSON string.
            previewContainer.textContent = JSON.stringify(raw, null, 2); // Use 2 spaces for indentation.
        } catch (error) {
            // Handle potential errors during JSON stringification (e.g., circular references, though unlikely here).
            console.error("[Preview] updatePreviewInternal: Error stringifying JSON preview:", error);
            previewContainer.textContent = `Error generating preview:\n${error.message}`;
            // Store error information in latestPreviewData for debugging if needed.
            latestPreviewData = { error: "Preview generation failed", message: error.message, stack: error.stack };
        }

    }, 250); // Debounce delay of 250ms.

    // --- Attach Event Listeners ---
    // Trigger the preview update on various form events.
    form.addEventListener('input', updatePreviewInternal); // Fired frequently on text changes.
    form.addEventListener('change', updatePreviewInternal); // Fired on select/checkbox changes.

    // Use event delegation for removal buttons to trigger updates immediately after removal.
    form.addEventListener('click', (event) => {
        // Check if the clicked element or its ancestor is one of the removal buttons.
        if (event.target.closest('.remove-property, .remove-option, .remove-field, .remove-attribute, .remove-responsive-image, .remove-column')) {
            // Use setTimeout to allow the DOM removal to complete before updating the preview.
            setTimeout(updatePreviewInternal, 50);
        }
    });

    // Listen for custom events dispatched by the renderer when complex parts of the form change.
    // This ensures the Defaults section and preview update correctly when properties are added/removed/modified.
    form.addEventListener('property-updated', updatePreviewInternal);
    form.addEventListener('property-removed', updatePreviewInternal);
    // Future potential custom events (if needed for more granular updates):
    // form.addEventListener('options-updated', updatePreviewInternal);
    // form.addEventListener('responsive-images-updated', updatePreviewInternal);

    // Initial call to generate the preview when the page loads.
    updatePreviewInternal();

    // Return the debounced update function (though it's not explicitly used externally in main.js).
    return updatePreviewInternal;
}

/**
 * Exports a function to retrieve the latest generated preview data object.
 * This is used by main.js during form submission.
 * @returns {object} - The last successfully generated preview data object.
 */
export function getCurrentPreviewData() {
    return latestPreviewData;
}
