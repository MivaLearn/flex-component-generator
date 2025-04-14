// preview.js
import {BASE_TYPE_FIELDS} from "./config.js"; // Import the field definitions

// Helper function to get structured form data (more robust than FormData directly for nested)
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
				/* console.warn(`Data structure conflict for key "${k}".`); */ current[k] = [];
			} // Less noisy console
			else if (!isNextKeyNumeric && Array.isArray(current[k])) {
				/* console.warn(`Data structure conflict for key "${k}".`); */ current[k] = {};
			}
			current = current[k];
		}
		const lastKey = keys[keys.length - 1];
		const isLastKeyNumeric = /^\d+$/.test(lastKey);
		if (isLastKeyNumeric && Array.isArray(current)) {
			current[parseInt(lastKey, 10)] = value;
		} else if (typeof current === "object" && !Array.isArray(current)) {
			current[lastKey] = value;
		} else if (isLastKeyNumeric && typeof current === "object") {
			current[lastKey] = value;
		} else {
			/* console.warn(`Could not assign value for key "${key}"`); */
		} // Less noisy console
	});
	const cleanArrays = (obj) => {
		if (Array.isArray(obj)) {
			return obj.filter((el) => el !== undefined && el !== null).map(cleanArrays);
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
	// console.log("Raw Form Data Parsed:", JSON.stringify(data, null, 2)); // DEBUG: Log raw parsed data before cleaning
	const cleanedData = cleanArrays(data);
	// console.log("Cleaned Structured Data:", JSON.stringify(cleanedData, null, 2)); // DEBUG: Log cleaned data
	return cleanedData;
}

// --- REVISED Recursive Helper to process properties dynamically ---
function processPropertyData(sourceData, definitions, isInsideTextSettings = false) {
	console.log(`--- processPropertyData called (isInsideTextSettings: ${isInsideTextSettings}) ---`); // DEBUG
	console.log(`   sourceData:`, JSON.parse(JSON.stringify(sourceData || {}))); // DEBUG (clone to avoid proxies)

	if (!sourceData || typeof sourceData !== "object" || !sourceData.code || !sourceData.type) {
		console.warn("   Skipping invalid/incomplete sourceData."); // DEBUG
		return null;
	}

	const target = {
		code: String(sourceData.code).trim(),
		type: sourceData.type,
	};
	console.log(`   Initial target:`, JSON.parse(JSON.stringify(target))); // DEBUG

	const fieldDefinitions = BASE_TYPE_FIELDS[target.type] || [];
	const fieldDefinitionsMap = new Map();
	fieldDefinitions.forEach((fc) => {
		if (typeof fc === "object" && fc.name) fieldDefinitionsMap.set(fc.name, fc);
		else if (typeof fc === "string") fieldDefinitionsMap.set(fc, {name: fc, type: "text"});
	});

	// Iterate through ALL keys in the sourceData for this property/field
	for (const fieldName in sourceData) {
		if (!sourceData.hasOwnProperty(fieldName)) continue;
		if (["code", "prompt", "type", "properties", "textsettings", "enable_textsettings", "fields", "responsive_images"].includes(fieldName)) continue;

		const value = sourceData[fieldName];
		if (value === undefined || value === null || value === "") continue;

		const fieldDef = fieldDefinitionsMap.get(fieldName);
		const expectedType = fieldDef?.type || "text";

		console.log(`   Processing source field: ${fieldName} | Value: ${value} | Expected Type: ${expectedType}`); // DEBUG

		// Process based on value and expected type
		if (expectedType === "boolean") {
			if (value === "true") target[fieldName] = true;
		} else if (expectedType === "number") {
			const num = Number(value);
			if (!isNaN(num)) target[fieldName] = num;
		} else if (fieldName === "options" && expectedType === "custom") {
			if (Array.isArray(value)) {
				const processedOptions = value.map((opt) => (opt?.text?.trim() && opt.value !== undefined && opt.value?.toString().trim() !== "" ? {text: opt.text.trim(), value: opt.value.toString().trim()} : null)).filter((opt) => opt !== null);
				if (processedOptions.length > 0) target[fieldName] = processedOptions;
				console.log(`       Processed options for ${fieldName}:`, processedOptions); // DEBUG
			} else {
				console.warn(`       Field ${fieldName} expected options array, got:`, value); // DEBUG
			}
		} else if (fieldName === "pseudoclasses" && typeof value === "string") {
			const items = value
				.split(",")
				.map((v) => v.trim())
				.filter(Boolean);
			if (items.length > 0) target[fieldName] = items;
		} else if (target.type === "text" && sourceData.text_type === "number" && ["min", "max", "step"].includes(fieldName)) {
			const num = Number(value);
			if (!isNaN(num)) target[fieldName] = num;
		} else {
			// Default string/other
			if (typeof value === "string") {
				const trimmed = value.trim();
				if (trimmed) target[fieldName] = trimmed;
			} else {
				target[fieldName] = value;
			}
		}
	} // End for..in loop

	// --- Handle nested 'properties' for groups ---
	if (target.type === "group" && sourceData.properties && Array.isArray(sourceData.properties)) {
		console.log(`   Processing nested group properties for ${target.code}...`); // DEBUG
		target.properties = sourceData.properties.map((childPropData) => processPropertyData(childPropData, definitions, false)).filter((prop) => prop !== null);
		if (target.properties.length === 0) delete target.properties;
	}

    // --- Handle textsettings object creation AFTER processing other fields ---
    const hasTextSettingsFieldInConfig = fieldDefinitionsMap.has("textsettings");
    // console.log(`   Property ${target.code}: hasTextSettingsFieldInConfig = ${hasTextSettingsFieldInConfig}`); // DEBUG

    if (hasTextSettingsFieldInConfig && sourceData.enable_textsettings === "true") {
        // Only process if config allows textsettings for this type AND enable flag is true
        console.log(`   Property ${target.code}: Type ${target.type} supports textsettings. Checking enable flag:`, sourceData.enable_textsettings); // DEBUG
        if (sourceData.enable_textsettings === "true") {
            console.log(`       Enable flag is true. Checking sourceData.textsettings.fields...`); // DEBUG
            // Check if sourceData.textsettings.fields exists and IS AN ARRAY
            if (sourceData?.fields && Array.isArray(sourceData.fields)) {
                console.log(`          Found source fields array:`, JSON.parse(JSON.stringify(sourceData.fields))); // DEBUG
                const processedFields = sourceData.fields // Correctly map the 'fields' array
                    .map((nestedFieldData, index) => {
                         console.log(`          Recursive call for textsettings field index ${index}`); // DEBUG
                         return processPropertyData(nestedFieldData, definitions, true) // Mark as inside textsettings
                        })
                    .filter((field) => field !== null); // Filter out invalid results

                if (processedFields.length > 0) {
                    // *** CHANGE HERE: Assign the array directly to target.textsettings ***
                    target.textsettings = processedFields;
                    console.log(`          SUCCESS: Added textsettings array to target:`, JSON.parse(JSON.stringify(target.textsettings))); // DEBUG
                } else {
                    console.log(`          WARNING: No valid nested fields processed. Not adding textsettings array.`); // DEBUG
                }
            } else {
                console.log(`          WARNING: sourceData.textsettings.fields is not an array or doesn't exist.`); // DEBUG
                if (sourceData.textsettings) console.log(`          Actual sourceData.textsettings:`, JSON.parse(JSON.stringify(sourceData.textsettings))); // DEBUG
            }
        } else {
            console.log(`       Enable flag is not 'true'. Skipping textsettings processing.`); // DEBUG
        }
    }
    // --- End Textsettings Handling --- //
        // --- Handle responsive_images array for image type ---
        if (target.type === 'image' && sourceData.responsive_images && Array.isArray(sourceData.responsive_images)) {
            const processedResponsive = sourceData.responsive_images
                .map(imgData => {
                    // Validate required fields for a responsive image entry
                    if (!imgData || !imgData.code?.trim() || !imgData.prompt?.trim()) {
                        return null;
                    }
                    const responsiveEntry = {
                        code: imgData.code.trim(),
                        prompt: imgData.prompt.trim(),
                    };
                    // Add width and height if they are valid numbers
                    const width = Number(imgData.width);
                    const height = Number(imgData.height);
                    if (!isNaN(width) && width > 0) responsiveEntry.width = width;
                    if (!isNaN(height) && height > 0) responsiveEntry.height = height;
                    return responsiveEntry;
                })
                .filter(entry => entry !== null); // Remove invalid entries
    
            if (processedResponsive.length > 0) {
                target.responsive_images = processedResponsive;
            }
        }
        // --- End responsive_images handling ---
    
	// --- Handle style fields ONLY if inside textsettings ---
	if (isInsideTextSettings) {
		// console.log(`   Inside textsettings (${target.code}), checking for style fields...`); // DEBUG
		if (sourceData.style?.trim()) {
			target.style = sourceData.style.trim();
			if (sourceData.style_prefix?.trim()) {
				target.style_prefix = sourceData.style_prefix.trim();
			}
			if (sourceData.style_suffix?.trim()) {
				target.style_suffix = sourceData.style_suffix.trim();
			}
			// console.log(`       Added style fields if present.`); // DEBUG
		}
	}

	// --- Ensure text_type itself is added if it exists in sourceData ---
	if (sourceData.text_type?.trim()) {
		target.text_type = sourceData.text_type.trim();
		// console.log(`   Added/Ensured text_type: ${target.text_type}`); // DEBUG
	}

	console.log(`--- processPropertyData finished for ${target.code}. Final target:`, JSON.parse(JSON.stringify(target))); // DEBUG: End of function
	return target;
}

export function setupPreview() {
	const form = document.querySelector("form");
	const previewContainer = document.getElementById("json-preview");

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
        // console.clear();
        // console.log("--- Updating Preview ---");
        const formData = getStructuredFormData(form);
        // console.log("Structured Form Data:", JSON.parse(JSON.stringify(formData || {})));

        const raw = {};

        // --- Top-level fields ---
        raw.code = formData.component_code || ''; raw.name = formData.component_name || ''; raw.version = formData.version || ''; raw.type = formData.type || 'component';
        if (formData.category?.trim()) { raw.category = formData.category; }
        raw.resourcegroup_code = formData.resourcegroup_code || ''; raw.initialization_template = "init.mvt"; raw.instance_template = "instance.mvt";

        // --- Styles ---
        raw.styles = [];
         // Check if the checkbox is checked (value should be 'true' from the form)
        if (formData.include_css === 'true') {
            console.log("Processing CSS attributes..."); // DEBUG
            const cssAttributes = [];
            // Ensure attribute arrays exist before trying to process
            const names = formData.css_attribute_name ? (Array.isArray(formData.css_attribute_name) ? formData.css_attribute_name : [formData.css_attribute_name]) : [];
            const values = formData.css_attribute_value ? (Array.isArray(formData.css_attribute_value) ? formData.css_attribute_value : [formData.css_attribute_value]) : [];
             console.log("   Raw CSS Names:", formData.css_attribute_name); // DEBUG
             console.log("   Raw CSS Values:", formData.css_attribute_value); // DEBUG
             console.log("   Processed CSS Names Array:", names); // DEBUG
             console.log("   Processed CSS Values Array:", values); // DEBUG

            // Iterate safely, ensuring lengths match roughly (or use index check)
            const len = Math.min(names.length, values.length); // Process only up to the shorter length
            for(let i = 0; i < len; i++) {
                const name = names[i]?.trim();
                const value = values[i]?.trim();
                 console.log(`   Checking CSS Attribute ${i}: name='${name}', value='${value}'`); // DEBUG
                if (name && value) { // Ensure both have non-empty trimmed values
                    cssAttributes.push({ name, value });
                }
            }
             console.log("   Final CSS Attributes:", cssAttributes); // DEBUG

            raw.styles.push({
                filepath: `src/css/${raw.code || 'component'}.css`,
                resource_code: raw.resourcegroup_code,
                ...(cssAttributes.length > 0 && { attributes: cssAttributes }), // Add attributes only if array is not empty
            });
        } else {
             console.log("CSS not included."); // DEBUG
        }

        // --- Scripts ---
        raw.scripts = [];
         // Check if the checkbox is checked
        if (formData.include_js === 'true') {
             console.log("Processing JS attributes..."); // DEBUG
            const jsAttributes = [];
            const names = formData.js_attribute_name ? (Array.isArray(formData.js_attribute_name) ? formData.js_attribute_name : [formData.js_attribute_name]) : [];
            const values = formData.js_attribute_value ? (Array.isArray(formData.js_attribute_value) ? formData.js_attribute_value : [formData.js_attribute_value]) : [];
             console.log("   Raw JS Names:", formData.js_attribute_name); // DEBUG
             console.log("   Raw JS Values:", formData.js_attribute_value); // DEBUG
             console.log("   Processed JS Names Array:", names); // DEBUG
             console.log("   Processed JS Values Array:", values); // DEBUG

            const len = Math.min(names.length, values.length);
            for(let i = 0; i < len; i++) {
                 const name = names[i]?.trim();
                 const value = values[i]?.trim();
                  console.log(`   Checking JS Attribute ${i}: name='${name}', value='${value}'`); // DEBUG
                 if (name && value) {
                     jsAttributes.push({ name, value });
                 }
            }
             console.log("   Final JS Attributes:", jsAttributes); // DEBUG

            raw.scripts.push({
                filepath: `src/js/${raw.code || 'component'}.js`,
                resource_code: raw.resourcegroup_code,
                ...(jsAttributes.length > 0 && { attributes: jsAttributes }),
            });
        } else {
            console.log("JS not included."); // DEBUG
        }


        // --- Properties ---
        raw.properties = [];
        if (formData.properties && Array.isArray(formData.properties)) {
            raw.properties = formData.properties
                .map(propData => processPropertyData(propData, BASE_TYPE_FIELDS))
                .filter(prop => prop !== null);
        }

        // --- Update the JSON preview ---
        // console.log("--- Final Raw Object for Preview ---"); // DEBUG
        // console.log(JSON.parse(JSON.stringify(raw))); // DEBUG
        try { previewContainer.textContent = JSON.stringify(raw, null, 2); }
        catch (error) { console.error("Error stringifying JSON preview:", error); previewContainer.textContent = "Error generating preview."; }
    }, 500);

    // --- Event Listeners ---
    form.addEventListener('input', updatePreview);
    form.addEventListener('click', (event) => {
         const target = event.target;
         if (target.classList.contains('remove-property') || target.classList.contains('remove-option') ||
             target.classList.contains('remove-field') || target.classList.contains('remove-attribute')) {
             setTimeout(updatePreview, 50);
         }
     });
    form.addEventListener('change', (event) => {
        const target = event.target;
        if (target.type === 'checkbox' || target.tagName === 'SELECT') {
             updatePreview();
        }
    });

    updatePreview(); // Initial call

}
