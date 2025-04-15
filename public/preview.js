// preview.js
import {BASE_TYPE_FIELDS} from "./config.js"; // Import the field definitions

// Helper function to get structured form data
function getStructuredFormData(form) {
	const formData = new FormData(form);
	const data = {};
	formData.forEach((value, key) => {
		if (!key) return;
		const keys = key.match(/[^[\]]+/g);
		if (!keys) {
			data[key] = value;
			return;
		}
		let current = data;
		for (let i = 0; i < keys.length - 1; i++) {
			const k = keys[i];
			const nextK = keys[i + 1];
			const isNextKeyNumeric = /^\d+$/.test(nextK);

			if (!(k in current)) {
				current[k] = isNextKeyNumeric ? [] : {};
			} else if (isNextKeyNumeric && !Array.isArray(current[k])) {
                // console.warn(`Data structure conflict for key "${k}". Expected array, got object. Overwriting.`);
				current[k] = [];
			} else if (!isNextKeyNumeric && Array.isArray(current[k])) {
                // console.warn(`Data structure conflict for key "${k}". Expected object, got array. Converting to object.`);
                const obj = {};
                current[k].forEach((item, index) => { obj[index] = item; });
                current[k] = obj;
			}
			current = current[k];
		}
		const lastKey = keys[keys.length - 1];
		const isLastKeyNumeric = /^\d+$/.test(lastKey);
		if (isLastKeyNumeric && Array.isArray(current)) {
			current[parseInt(lastKey, 10)] = value;
		} else if (typeof current === 'object' && !Array.isArray(current)) {
			current[lastKey] = value;
		} else {
			// console.warn(`Could not assign value for key path "${key}"`);
		}
	});

	const cleanArrays = (obj) => {
		if (Array.isArray(obj)) {
			return obj.filter(el => el !== undefined).map(cleanArrays);
		} else if (typeof obj === "object" && obj !== null) {
			const newObj = {};
			for (const key in obj) {
				if (Object.prototype.hasOwnProperty.call(obj, key)) {
					newObj[key] = cleanArrays(obj[key]);
				}
			}
			return newObj;
		}
		return obj;
	};
	const cleanedData = cleanArrays(data);
	return cleanedData;
}

// --- Helper to process properties (Works for both standard and advanced) ---
function processPropertyData(sourceData, definitions, isInsideTextSettings = false) {
    // Processes a single property definition object.
	if (!sourceData || typeof sourceData !== "object" || !sourceData.code || !sourceData.type) {
		return null;
	}

	const target = {
		code: String(sourceData.code).trim(),
		type: sourceData.type,
	};
    if (sourceData.prompt?.trim()) { target.prompt = sourceData.prompt.trim(); }

	const fieldDefinitions = definitions[target.type] || [];
	const fieldDefinitionsMap = new Map(fieldDefinitions.map(fc => [typeof fc === 'string' ? fc : fc.name, typeof fc === 'string' ? { name: fc, type: 'text' } : fc]));

    // Process standard fields based on definitions
	for (const fieldName in sourceData) {
		if (!sourceData.hasOwnProperty(fieldName) || ["code", "prompt", "type", "properties", "group_fields", "fields", "enable_textsettings", "options", "responsive_images", "pseudoclasses", "lookup"].includes(fieldName)) continue;

		const value = sourceData[fieldName];
		if (value === undefined || value === null || value === "") continue;

		const fieldDef = fieldDefinitionsMap.get(fieldName);
		const expectedType = fieldDef?.type || "text";

        if (expectedType === "boolean") {
            if (value === "true") target[fieldName] = true;
        } else if (expectedType === "number" || (target.type === "text" && sourceData.text_type === "number" && ["min", "max", "step", "minlength", "maxlength"].includes(fieldName))) {
            const num = Number(value);
            if (!isNaN(num)) target[fieldName] = num;
        } else if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed) target[fieldName] = trimmed;
        } else {
            target[fieldName] = value; // Keep non-string values
        }
	}

    // Handle special array/object types
    if (fieldDefinitionsMap.has("options") && sourceData.options && Array.isArray(sourceData.options)) {
        target.options = sourceData.options
            .map(opt => (opt?.text?.trim() && opt.value?.toString().trim() ? { text: opt.text.trim(), value: opt.value.toString().trim() } : null))
            .filter(opt => opt);
        if (target.options.length === 0) delete target.options;
    }
    if (fieldDefinitionsMap.has("pseudoclasses") && typeof sourceData.pseudoclasses === 'string') {
        target.pseudoclasses = sourceData.pseudoclasses.split(",").map(v => v.trim()).filter(Boolean);
        if (target.pseudoclasses.length === 0) delete target.pseudoclasses;
    }
    if (target.type === 'image' && sourceData.responsive_images && Array.isArray(sourceData.responsive_images)) {
        target.responsive_images = sourceData.responsive_images
            .map(imgData => {
                if (!imgData || !imgData.code?.trim() || !imgData.prompt?.trim()) return null;
                const entry = { code: imgData.code.trim(), prompt: imgData.prompt.trim() };
                const w = Number(imgData.width); if (!isNaN(w) && w > 0) entry.width = w;
                const h = Number(imgData.height); if (!isNaN(h) && h > 0) entry.height = h;
                return entry;
            })
            .filter(entry => entry);
        if (target.responsive_images.length === 0) delete target.responsive_images;
    }
    if (target.type === 'customlookup' && sourceData.lookup && typeof sourceData.lookup === 'object') {
        const lookupData = sourceData.lookup;
        const targetLookup = {};
        if (lookupData.module_code?.trim()) targetLookup.module_code = lookupData.module_code.trim();
        if (lookupData.module_function?.trim()) targetLookup.module_function = lookupData.module_function.trim();
        if (lookupData.selection_column?.trim()) targetLookup.selection_column = lookupData.selection_column.trim();
        if (lookupData.title?.trim()) targetLookup.title = lookupData.title.trim();
        if (lookupData.default_sort?.trim()) targetLookup.default_sort = lookupData.default_sort.trim();
        if (lookupData.columns && Array.isArray(lookupData.columns)) {
            targetLookup.columns = lookupData.columns.map(colData => {
                if (!colData || !colData.code?.trim() || !colData.header?.trim() || !colData.type?.trim()) return null;
                const col = { code: colData.code.trim(), header: colData.header.trim(), type: colData.type.trim() };
                if (colData.sortable === 'true') col.sortable = true;
                if (colData.searchable === 'true') col.searchable = true;
                return col;
            }).filter(col => col);
            if (targetLookup.columns.length === 0) delete targetLookup.columns;
        }
        if (targetLookup.module_code && targetLookup.module_function && targetLookup.selection_column && targetLookup.columns) {
            target.lookup = targetLookup;
        } else { console.warn(`Skipping incomplete lookup for ${target.code}`); }
    }

    // --- Handle nested structures recursively ---
    let childPropertiesKey = null;
    if (target.type === 'group' && sourceData.properties && Array.isArray(sourceData.properties)) {
        childPropertiesKey = 'properties';
    } else if (['list', 'grouplist'].includes(target.type) && sourceData.group_fields && Array.isArray(sourceData.group_fields)) {
         childPropertiesKey = 'group_fields';
    }
    let textSettingsFields = null;
    if (target.type === 'textsettings' && sourceData.enable_textsettings === 'true' && sourceData.fields && Array.isArray(sourceData.fields)) {
        textSettingsFields = sourceData.fields;
    }

    // Recurse for Group/List children
    if (childPropertiesKey) {
        // Assign processed children to the correct key in the target ('properties' or 'group_fields')
        target[childPropertiesKey] = sourceData[childPropertiesKey]
            .map(childPropData => processPropertyData(childPropData, definitions, false)) // isInsideTextSettings = false
            .filter(prop => prop !== null);
        if (target[childPropertiesKey].length === 0) {
            delete target[childPropertiesKey];
        }
    }
    // Recurse for Textsettings children
    if (textSettingsFields) {
         target.textsettings = { // Assuming textsettings is an object containing fields
            fields: textSettingsFields
                .map(fieldData => processPropertyData(fieldData, definitions, true)) // isInsideTextSettings = true
                .filter(field => field !== null)
        };
        if (target.textsettings.fields.length === 0) delete target.textsettings;
    }

     // Add textsettings style fields ONLY if inside textsettings context
     if (isInsideTextSettings) {
        if (sourceData.style?.trim()) {
            target.style = sourceData.style.trim();
            if (sourceData.style_prefix?.trim()) target.style_prefix = sourceData.style_prefix.trim();
            if (sourceData.style_suffix?.trim()) target.style_suffix = sourceData.style_suffix.trim();
        }
     }

	return target;
}


// --- Recursive Helper to build the PREVIEW defaults object ---
/**
 * Recursively processes the defaults data from the form based on the processed property structure.
 * @param {object} sourceDefaultsLevel - The defaults object for the current level (e.g., formData.defaults or formData.defaults.advanced or children object).
 * @param {Map} propertyMap - A flat map of code -> property definition for easy lookup of types and nested structures.
 * @returns {object} The processed defaults object for the preview for this level.
 */
function processDefaultsLevelPreview(sourceDefaultsLevel, propertyMap) {
    const processedLevel = {};
    if (!sourceDefaultsLevel || typeof sourceDefaultsLevel !== 'object') {
        return processedLevel; // Return empty if no source defaults for this level
    }

    // Iterate through the keys in the current level of sourceDefaults (which correspond to property codes)
    for (const propCode in sourceDefaultsLevel) {
        if (!sourceDefaultsLevel.hasOwnProperty(propCode)) continue;

        const defaultData = sourceDefaultsLevel[propCode]; // Data for this default (e.g., {value: "..."} or {children: {...}} or {value_csv: "..."})
        const propDef = propertyMap.get(propCode); // Find the property definition using the map

        if (!propDef) {
            // console.warn(`Property definition not found for default code: ${propCode}. Skipping default.`);
            continue; // Skip if the property doesn't exist in the final structure
        }

        // --- Handle based on property type ---
        if (propDef.type === 'group') {
            // Expected format from form: { children: { child_code: { value: ... }, ... } }
            if (defaultData && defaultData.children && typeof defaultData.children === 'object' && propDef.properties) {
                // Recursively process children, passing child defaults and the SAME property map
                const processedChildren = processDefaultsLevelPreview(defaultData.children, propertyMap);
                if (Object.keys(processedChildren).length > 0) {
                    // Final format: { children: { child_code: { value: ... } } }
                    processedLevel[propCode] = { children: processedChildren };
                }
            }
        } else if (propDef.type === 'list') {
            // Check for our special textarea input {value_csv: "..."}
             if (defaultData && defaultData.hasOwnProperty('value_csv')) {
                 const csvValue = defaultData.value_csv?.trim();
                 if (csvValue) {
                      // Split CSV string into an array of strings
                      const arrayValue = csvValue.split(',').map(s => s.trim()).filter(Boolean);

                      // **Basic Type Conversion (Refinement based on list_type):**
                      let listType = propDef.list_type || 'text';
                      let convertedArray = arrayValue;
                      if (listType === 'number') { // Example: Convert to numbers if list_type is number
                          convertedArray = arrayValue.map(Number).filter(n => !isNaN(n));
                      }
                      // Add more conversions here if needed (e.g., boolean, date)

                      if (convertedArray.length > 0) {
                          // Final format: { value: [...] }
                          processedLevel[propCode] = { value: convertedArray };
                      }
                 }
             } else if (defaultData && defaultData.hasOwnProperty('value') && Array.isArray(defaultData.value)) {
                 // Handle case where value might already be an array (less likely from UI)
                 if (defaultData.value.length > 0) processedLevel[propCode] = { value: defaultData.value };
             }
        } else if (propDef.type === 'image') {
             // Special handling for image: { value: "...", responsive_images: { code: "..." } }
             const imageDefault = {};
             let hasValue = false;
             // Main image value
             if (defaultData && defaultData.value?.trim()) {
                 imageDefault.value = defaultData.value.trim();
                 hasValue = true;
             }
             // Responsive image values (nested under 'responsive_images' key in the *default* data)
             if (defaultData && defaultData.responsive_images && typeof defaultData.responsive_images === 'object') {
                 const responsiveDefaults = {};
                 let hasResponsive = false;
                 for (const respCode in defaultData.responsive_images) {
                     if (defaultData.responsive_images.hasOwnProperty(respCode) && defaultData.responsive_images[respCode]?.trim()) {
                          responsiveDefaults[respCode] = defaultData.responsive_images[respCode].trim();
                          hasResponsive = true;
                     }
                 }
                  if (hasResponsive) {
                      imageDefault.responsive_images = responsiveDefaults;
                      hasValue = true; // Mark as having value even if only responsive set
                  }
             }
              if (hasValue) {
                  processedLevel[propCode] = imageDefault;
              }
        } else {
            // --- Handle Standard/Simple Types (expecting { value: ... } from form) ---
            if (defaultData && defaultData.hasOwnProperty('value')) {
                let value = defaultData.value;

                // Skip if value is empty string (unless it's a checkbox default where "" means "no default")
                if (value === '' && propDef.type !== 'checkbox') continue;

                // Convert value based on property type
                if (propDef.type === 'checkbox') {
                    if (value === 'true') value = true;
                    else if (value === 'false') value = false;
                    else continue; // Skip if "" (no default selected)
                } else if (['number', 'slider', 'distributedslider'].includes(propDef.type)) {
                    const num = Number(value);
                    if (!isNaN(num)) {
                        value = num;
                    } else { continue; } // Skip invalid number
                } else if (value && typeof value === 'string') {
                    value = value.trim(); // Trim other strings
                }

                 // Add the processed value, structure is { value: ... }
                 processedLevel[propCode] = { value: value };
            }
        }
    } // End for...in loop

    return processedLevel;
}


// --- Helper function to add properties to raw array and map ---
// Defined outside updatePreview to be accessible by recursive calls within it
function processAndMapProperties(propArraySource, targetArray, propertyMap) {
    if (propArraySource && Array.isArray(propArraySource)) {
         propArraySource.map(propData => processPropertyData(propData, BASE_TYPE_FIELDS, false))
            .filter(prop => {
                if (prop !== null && prop.code) {
                    targetArray.push(prop); // Add to the correct raw array
                    propertyMap.set(prop.code, prop); // Add to the map

                    // --- CORRECTED: Pass propertyMap to addNestedToMap ---
                    function addNestedToMap(nestedPropsArray, map) { // Added map parameter
                         if (!nestedPropsArray || !Array.isArray(nestedPropsArray)) return;
                         nestedPropsArray.forEach(nestedProp => {
                             if (nestedProp && nestedProp.code) {
                                 map.set(nestedProp.code, nestedProp); // Use the passed map
                                 // Recurse deeper for groups within groups etc.
                                 // Check the key used in the processed 'prop' object
                                 if (nestedProp.properties) addNestedToMap(nestedProp.properties, map); // Pass map down
                                 // Lists/Grouplists might define their structure under 'properties' after processing
                                 // Or potentially under 'group_fields' if that key was kept
                                 if (nestedProp.group_fields) addNestedToMap(nestedProp.group_fields, map); // Pass map down
                                 if (nestedProp.textsettings?.fields) addNestedToMap(nestedProp.textsettings.fields, map); // Pass map down
                             }
                         });
                     }
                     // --- CORRECTED: Initial call passes propertyMap ---
                     // Check potential keys for nested properties in the CURRENTLY processed 'prop'
                     if(prop.properties) addNestedToMap(prop.properties, propertyMap);
                     if(prop.group_fields) addNestedToMap(prop.group_fields, propertyMap);
                     if(prop.textsettings?.fields) addNestedToMap(prop.textsettings.fields, propertyMap);

                    return true; // Keep valid property
                }
                return false; // Discard invalid property
            });
    }
}


// --- Main Preview Setup ---
export function setupPreview() {
	const form = document.querySelector("form");
	const previewContainer = document.getElementById("json-preview");
    if (!form || !previewContainer) {
        console.error("Form or Preview Container not found!");
        return;
    }

	function debounce(func, delay) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }

    const updatePreview = debounce(() => {
        const formData = getStructuredFormData(form);

        // Initialize final JSON object
        const raw = {};

        // --- Process Top-level fields ---
        raw.code = formData.component_code?.trim() || '';
        raw.name = formData.component_name?.trim() || '';
        raw.version = formData.version?.trim() || '';
        raw.type = formData.type || 'component';
        if (formData.category?.trim()) { raw.category = formData.category.trim(); }
        raw.resourcegroup_code = formData.resourcegroup_code?.trim() || '';
        raw.initialization_template = "src/templates/init.mvt";
        raw.instance_template = "src/templates/instance.mvt";

        // --- Process Styles & Scripts ---
        raw.styles = [];
        if (formData.include_css === 'true') {
            const cssAttributes = [];
            const names = formData.css_attribute_name ? (Array.isArray(formData.css_attribute_name) ? formData.css_attribute_name : [formData.css_attribute_name]) : [];
            const values = formData.css_attribute_value ? (Array.isArray(formData.css_attribute_value) ? formData.css_attribute_value : [formData.css_attribute_value]) : [];
            const len = Math.max(names.length, values.length);
            for(let i = 0; i < len; i++) {
                const name = names[i]?.trim(); const value = values[i]?.trim();
                if (name && value) { cssAttributes.push({ name, value }); }
            }
             // Add styles object even if attributes are empty, if checkbox is checked
             raw.styles.push({
                 filepath: `src/css/${raw.code || 'component'}.css`,
                 resource_code: raw.resourcegroup_code,
                 ...(cssAttributes.length > 0 && { attributes: cssAttributes }) // Conditionally add attributes
             });
        }
        raw.scripts = [];
        if (formData.include_js === 'true') {
            const jsAttributes = [];
            const names = formData.js_attribute_name ? (Array.isArray(formData.js_attribute_name) ? formData.js_attribute_name : [formData.js_attribute_name]) : [];
            const values = formData.js_attribute_value ? (Array.isArray(formData.js_attribute_value) ? formData.js_attribute_value : [formData.js_attribute_value]) : [];
            const len = Math.max(names.length, values.length);
            for(let i = 0; i < len; i++) {
                 const name = names[i]?.trim(); const value = values[i]?.trim();
                 if (name && value) { jsAttributes.push({ name, value }); }
            }
             // Add scripts object even if attributes are empty, if checkbox is checked
             raw.scripts.push({
                 filepath: `src/js/${raw.code || 'component'}.js`,
                 resource_code: raw.resourcegroup_code,
                 ...(jsAttributes.length > 0 && { attributes: jsAttributes }) // Conditionally add attributes
             });
        }

        // --- Process Properties AND Build Combined Property Map ---
        raw.properties = []; // Standard properties
        raw.advanced_properties = []; // Advanced properties
        const propertyMap = new Map(); // Combined map: code -> definition object

        // Process standard properties using the helper function
        processAndMapProperties(formData.properties, raw.properties, propertyMap);
        // Process advanced properties using the helper function
        processAndMapProperties(formData.advanced_properties, raw.advanced_properties, propertyMap);

        // Clean up empty properties arrays if they exist
        if (raw.properties.length === 0) {
            delete raw.properties; // Remove if empty, optional based on spec preference
        }
        if (raw.advanced_properties.length === 0) {
             delete raw.advanced_properties; // Remove if empty
        }
        // console.log("Combined Property Map:", propertyMap); // Debug


        // --- Process Defaults (Standard and Advanced) ---
        raw.defaults = {}; // Initialize top-level defaults

        // Process standard defaults (properties directly under formData.defaults)
        const standardDefaultsData = { ...formData.defaults }; // Clone
        if (standardDefaultsData?.advanced) {
            delete standardDefaultsData.advanced; // Remove advanced part for this step
        }
        const processedStandardDefaults = processDefaultsLevelPreview(standardDefaultsData, propertyMap);
        Object.assign(raw.defaults, processedStandardDefaults); // Assign processed standard defaults

        // Process advanced defaults (properties under formData.defaults.advanced)
        if (formData.defaults?.advanced) {
            const processedAdvancedDefaults = processDefaultsLevelPreview(formData.defaults.advanced, propertyMap);
            if (Object.keys(processedAdvancedDefaults).length > 0) {
                 raw.defaults.advanced = processedAdvancedDefaults; // Nest under 'advanced' key
            }
        }

        // --- Clean up empty defaults object ---
        if (Object.keys(raw.defaults).length === 0 || (Object.keys(raw.defaults).length === 1 && raw.defaults.hasOwnProperty('advanced') && Object.keys(raw.defaults.advanced).length === 0)) {
             // Delete if completely empty OR only contains an empty 'advanced' object
            delete raw.defaults;
        }


        // --- Update the JSON preview ---
        try {
            previewContainer.textContent = JSON.stringify(raw, null, 2);
        } catch (error) {
            console.error("Error stringifying JSON preview:", error);
            previewContainer.textContent = "Error generating preview.";
        }
    }, 250);

    // --- Event Listeners ---
    form.addEventListener('input', updatePreview);
    form.addEventListener('change', updatePreview);
    form.addEventListener('click', (event) => {
         if (event.target.closest('.remove-property, .remove-option, .remove-field, .remove-attribute, .remove-responsive-image, .remove-column')) {
             setTimeout(updatePreview, 50);
         }
     });
     form.addEventListener('property-updated', updatePreview);
     form.addEventListener('property-removed', updatePreview);
     // No need for separate advanced listeners if events bubble correctly


    // Initial call to populate the preview on load
    updatePreview();
}
