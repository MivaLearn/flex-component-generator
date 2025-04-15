// server.js

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const tar = require('tar'); // Keep for potential future use
const qs = require('qs');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from 'public' AND the root directory for html/css/js
app.use(express.static(__dirname)); // Serve index.html, main.js etc. from root
app.use(express.static(path.join(__dirname, 'public'))); // Optional: if you have a public dir

// Middleware to parse x-www-form-urlencoded data using qs
app.use(express.urlencoded({ extended: true })); // extended: true uses qs

// --- Refined parseProperty Function ---
// This function now expects a single property object as input
// IMPORTANT: It IGNORES the 'default_value' field, which is handled separately.
function parseProperty(propData) {
  if (!propData || !propData.code || !propData.prompt || !propData.type) {
    console.warn('Skipping incomplete property data:', propData);
    return null; // Skip incomplete properties
  }

  const type = propData.type; // Capture type early for conditional logic
  const code = propData.code.trim(); // Capture code for logging

  const base = {
    code: code,
    prompt: propData.prompt.trim(),
    type: type,
  };

  // Add optional string fields if they exist and are not empty
  // Exclude 'default_value' here
  const stringFields = [
    'placeholder', 'preview_property_selector', 'text_type',
    'validation_pattern', 'validation_message', 'size', 'label',
    'module_code', 'module_function', 'item_type', 'style', 'style_prefix', 'style_suffix' // Added more
  ];
  stringFields.forEach(field => {
    // IMPORTANT check: Make sure field is not 'default_value'
    if (field !== 'default_value' && propData[field] && String(propData[field]).trim() !== '') {
        // Special handling for style prefix/suffix
        if ((field === 'style_prefix' || field === 'style_suffix') && !propData.style?.trim()) return;
        // Special handling for customlookup module/function (added within lookup object)
        if (type === 'customlookup' && (field === 'module_code' || field === 'module_function')) return;
        base[field] = String(propData[field]).trim();
    }
  });

   // Boolean fields (check for 'true' string or boolean true)
   const booleanFields = ['required', 'markdown', 'collapsed', 'can_disable'];
   booleanFields.forEach(field => {
       if (propData[field] === 'true' || propData[field] === true) {
           base[field] = true;
       }
   });

  // Numeric fields
  const numericFields = ['minlength', 'maxlength', 'min', 'max', 'step'];
  numericFields.forEach(field => {
    // Check existence and non-empty string before converting
    if (propData[field] !== undefined && propData[field] !== '') {
      const num = Number(propData[field]);
      if (!isNaN(num)) {
        base[field] = num;
      }
    }
  });

  // Options for select, radio, etc.
  if (['select', 'radio', 'selector'].includes(type) && propData.options && Array.isArray(propData.options)) {
    base.options = propData.options
      .map(opt => (opt && opt.text && opt.value) ? { text: opt.text.trim(), value: opt.value.trim() } : null)
      .filter(opt => opt !== null && opt.text && opt.value); // Ensure both text and value are non-empty
    if (base.options.length === 0) delete base.options; // Remove if empty
  }

  // Pseudoclasses for select/selector (assuming comma-separated input)
   if (['select', 'selector'].includes(type) && propData.pseudoclasses && typeof propData.pseudoclasses === 'string') {
       base.pseudoclasses = propData.pseudoclasses.split(',')
           .map(v => v.trim())
           .filter(Boolean);
       if (base.pseudoclasses.length === 0) delete base.pseudoclasses;
   }


  // Textsettings (check enable flag)
  // IMPORTANT: Recursive call must also ignore 'default_value'
  if (type === 'textsettings' && propData.enable_textsettings === 'true' && propData.textsettings && propData.textsettings.fields && Array.isArray(propData.textsettings.fields)) {
      base.textsettings = {
          fields: propData.textsettings.fields
              .map(fieldData => parseProperty(fieldData)) // Recursively parse nested fields (will ignore default_value)
              .filter(field => field !== null) // Filter out invalid nested fields
      };
      if (base.textsettings.fields.length === 0) delete base.textsettings; // Remove if empty
  }

  // Group/Grouplist Properties (requires recursive parsing)
  // IMPORTANT: Recursive call must also ignore 'default_value'
    if (['group', 'grouplist'].includes(type)) {
        let sourceFields = null;
        if (propData.group_fields && Array.isArray(propData.group_fields)) {
             sourceFields = propData.group_fields;
             base.group_fields = sourceFields // Default key for grouplist
                .map(fieldData => parseProperty(fieldData))
                .filter(field => field !== null);
             if (base.group_fields.length === 0) delete base.group_fields;
        } else if (propData.properties && Array.isArray(propData.properties)) {
             // Handle alternative 'properties' key for group if used
             sourceFields = propData.properties;
             base.properties = sourceFields // Use 'properties' key for group
                .map(fieldData => parseProperty(fieldData))
                .filter(field => field !== null);
            if (base.properties.length === 0) delete base.properties;
        }
    }


    // --- Handle customlookup ---
    if (type === 'customlookup' && propData.lookup && typeof propData.lookup === 'object') {
      const lookupData = propData.lookup;
      const targetLookup = {};

      // Validate and assign required fields
      if (lookupData.module_code?.trim()) targetLookup.module_code = lookupData.module_code.trim(); else console.warn(`Missing module_code for customlookup ${code}`);
      if (lookupData.module_function?.trim()) targetLookup.module_function = lookupData.module_function.trim(); else console.warn(`Missing module_function for customlookup ${code}`);
      if (lookupData.selection_column?.trim()) targetLookup.selection_column = lookupData.selection_column.trim(); else console.warn(`Missing selection_column for customlookup ${code}`);

      // Optional fields
      if (lookupData.title?.trim()) targetLookup.title = lookupData.title.trim();
      if (lookupData.default_sort?.trim()) targetLookup.default_sort = lookupData.default_sort.trim();

      // Columns array
      if (lookupData.columns && Array.isArray(lookupData.columns)) {
          targetLookup.columns = lookupData.columns
              .map(colData => {
                  // Validate required column fields
                  if (!colData || !colData.code?.trim() || !colData.header?.trim() || !colData.type?.trim()) {
                      console.warn(`Skipping invalid column in customlookup ${code}:`, colData);
                      return null;
                  }
                  const targetColumn = {
                      code: colData.code.trim(),
                      header: colData.header.trim(),
                      type: colData.type.trim(),
                  };
                  // Optional booleans
                  if (colData.sortable === 'true') targetColumn.sortable = true;
                  if (colData.searchable === 'true') targetColumn.searchable = true;
                  return targetColumn;
              })
              .filter(col => col !== null);

          if (targetLookup.columns.length === 0) {
               console.warn(`Customlookup ${code} has an empty 'columns' array after processing.`);
               delete targetLookup.columns; // Remove empty array
          }
      } else {
          console.warn(`Missing or invalid 'columns' array for customlookup ${code}`);
      }

      // Only add lookup object if essential fields are present
      if (targetLookup.module_code && targetLookup.module_function && targetLookup.selection_column && targetLookup.columns) {
          base.lookup = targetLookup;
      } else {
           console.error(`Failed to add 'lookup' object for property ${code} due to missing required fields.`);
      }
    }

  return base;
}


// --- NEW: Function to build the final defaults object ---
/**
 * Recursively processes original form property data to build the flat defaults object.
 * @param {Array} propertyFormDataArray - The array of property data from req.body (e.g., req.body.properties).
 * @param {Map} finalPropertyTypesMap - A map of property code -> type, generated from the final flexJson.properties.
 * @param {object} targetDefaultsObject - The flexJson.defaults object to populate.
 */
function buildDefaultsObject(propertyFormDataArray, finalPropertyTypesMap, targetDefaultsObject) {
    if (!Array.isArray(propertyFormDataArray)) {
        // console.warn("buildDefaultsObject: Input is not an array:", propertyFormDataArray);
        return;
    }

    propertyFormDataArray.forEach(propData => {
        if (!propData) return; // Skip null/undefined entries

        // Process the default value for the current property
        // Check hasOwnProperty to ensure 'default_value' truly exists (and isn't inherited, though unlikely here)
        // Also check it's not null/undefined/empty string
        if (propData.code && propData.hasOwnProperty('default_value') && propData.default_value !== null && propData.default_value !== undefined && propData.default_value !== '') {
            const code = String(propData.code).trim();
            const type = finalPropertyTypesMap.get(code);
            let valueToSet = propData.default_value; // Start with raw form value (often string)

            if (type === undefined) {
                // This might happen if a property was defined in the form but filtered out (e.g., incomplete) during parseProperty
                console.warn(`Could not find type for property code "${code}" when processing defaults. Skipping default for this property.`);
            } else {
                 // Process/convert the value based on the final property type
                if (type === 'checkbox') {
                    // Form sends 'true' or 'false' string via the select dropdown used for boolean defaults
                    valueToSet = (valueToSet === 'true'); // Convert string to boolean
                } else if (['number', 'slider', 'distributedslider'].includes(type)) {
                    const num = Number(valueToSet);
                    if (!isNaN(num)) {
                        valueToSet = num; // Convert to number if valid
                    } else {
                        console.warn(`Could not convert default value "${valueToSet}" to number for property "${code}" (type: ${type}). Skipping default.`);
                        valueToSet = undefined; // Mark as invalid to prevent adding it
                    }
                } else if (['select', 'radio', 'selector', 'text', 'textarea', 'date', 'datetime', /* other string types */].includes(type)) {
                     // Ensure value is string, trim it (usually already string from form)
                     valueToSet = String(valueToSet).trim();
                     // Add specific date/datetime validation or formatting if needed here
                }
                // Add more type conversions if necessary (e.g., date parsing, complex types)

                // Only add to defaults object if the value is valid (not marked as undefined)
                if (valueToSet !== undefined) {
                    targetDefaultsObject[code] = { value: valueToSet };
                }
            }
        }

        // Recurse into nested properties using the original form data structure
        // Note: Defaults are always flat, so we pass the same `targetDefaultsObject` down.
        // Check for the keys used in your `parseProperty` for nested items.
        if (propData.properties && Array.isArray(propData.properties)) { // Used by 'group'
            buildDefaultsObject(propData.properties, finalPropertyTypesMap, targetDefaultsObject);
        }
        if (propData.group_fields && Array.isArray(propData.group_fields)) { // Used by 'grouplist'
            buildDefaultsObject(propData.group_fields, finalPropertyTypesMap, targetDefaultsObject);
        }
         // Handle textsettings if their fields could potentially have defaults (rare)
        if (propData.textsettings && propData.textsettings.fields && Array.isArray(propData.textsettings.fields)) {
             buildDefaultsObject(propData.textsettings.fields, finalPropertyTypesMap, targetDefaultsObject);
        }
        // Add other potential nested structures if necessary
    });
}


app.post('/generate', async (req, res) => {
  // req.body is already parsed by express.urlencoded with qs
  const formData = req.body;

  const {
    component_name,
    component_code,
    version,
    type = 'component', // Default type
    category,
    resourcegroup_code, // Global resource code
    include_css, // Will be 'true' string if checked, otherwise undefined
    include_js,  // Will be 'true' string if checked, otherwise undefined
    css_attribute_name,
    css_attribute_value,
    js_attribute_name,
    js_attribute_value,
    properties // This should now be an array/object from qs, containing default_value fields
  } = formData;

  // Basic validation
  if (!component_name || !component_code || !version || !resourcegroup_code) {
    return res.status(400).json({ error: 'Missing required component details (Name, Code, Version, Resource Group Code).' });
  }
  if (!/^[a-z0-9\-]+$/.test(component_code)) {
     return res.status(400).json({ error: 'Component Code can only contain lowercase letters, numbers, and hyphens.' });
  }
   if (!/^\d+\.\d+\.\d+$/.test(version)) {
     return res.status(400).json({ error: 'Version must be in semantic format (e.g., 1.0.0).' });
  }


  const folderName = component_code.toLowerCase();
  const outputDir = path.join(__dirname, 'generated', folderName);
  const srcDir = path.join(outputDir, 'src');
  const templatesDir = path.join(srcDir, 'templates');
  const cssDir = path.join(srcDir, 'css');
  const jsDir = path.join(srcDir, 'js');

  try {
    await fs.ensureDir(templatesDir);
    if (include_css === 'true') await fs.ensureDir(cssDir);
    if (include_js === 'true') await fs.ensureDir(jsDir);

    // --- Process Attributes ---
    const processAttributes = (names, values) => {
        const attributes = [];
        if (names && values) {
            const nameArray = Array.isArray(names) ? names : [names];
            const valueArray = Array.isArray(values) ? values : [values];
            nameArray.forEach((name, index) => {
                if (name && valueArray[index]) { // Check both exist
                    const trimmedName = name.trim();
                    const trimmedValue = valueArray[index].trim();
                    if (trimmedName && trimmedValue) { // Ensure non-empty after trim
                        attributes.push({
                            name: trimmedName,
                            value: trimmedValue,
                        });
                    }
                }
            });
        }
        return attributes;
    };

    const cssAttributes = processAttributes(css_attribute_name, css_attribute_value);
    const jsAttributes = processAttributes(js_attribute_name, js_attribute_value);

    // --- Build the flex.json object ---
    const flexJson = {
      name: component_name.trim(),
      code: component_code.trim(),
      version: version.trim(),
      type,
      // category: category || null, // Include category only if selected
      resourcegroup_code: resourcegroup_code.trim(),
      initialization_template: "src/templates/init.mvt", // Use relative path
      instance_template: "src/templates/instance.mvt",   // Use relative path
      styles: [],
      scripts: [],
      properties: [] // Initialize properties array first
      // Defaults object added later
    };
    if (category) { // Only add category if it has a value
        flexJson.category = category;
    }

    // Add styles if included
    if (include_css === 'true') {
      flexJson.styles.push({
        filepath: `src/css/${folderName}.css`, // Relative path
        resource_code: flexJson.resourcegroup_code,
        ...(cssAttributes.length > 0 && { attributes: cssAttributes }), // Add attributes only if they exist
      });
    }

    // Add scripts if included
    if (include_js === 'true') {
      flexJson.scripts.push({
        filepath: `src/js/${folderName}.js`, // Relative path
        resource_code: flexJson.resourcegroup_code,
        ...(jsAttributes.length > 0 && { attributes: jsAttributes }), // Add attributes only if they exist
      });
    }

    // --- Process Properties (using parseProperty, which ignores default_value) ---
    // This step builds the final `flexJson.properties` structure.
    const originalPropertyArray = properties && typeof properties === 'object'
        ? (Array.isArray(properties) ? properties : Object.values(properties))
        : []; // Ensure we have an array, even if empty

    flexJson.properties = originalPropertyArray
        .map(propData => parseProperty(propData)) // Use the refined parseProperty
        .filter(prop => prop !== null); // Filter out any null results from incomplete data

    // --- NEW: Build Defaults Object ---
    flexJson.defaults = {}; // Initialize the defaults object

    // 1. Create a map of code -> type from the FINAL properties structure
    const finalPropTypes = new Map();
    function buildFinalTypeMap(propsArray, map) {
        if (!Array.isArray(propsArray)) return;
        propsArray.forEach(prop => {
            if (prop && prop.code && prop.type) {
                map.set(prop.code, prop.type);
            }
            // Recurse into nested structures based on keys present in final flexJson.properties
             if (prop && prop.properties && Array.isArray(prop.properties)) { // For groups
                 buildFinalTypeMap(prop.properties, map);
             }
             if (prop && prop.group_fields && Array.isArray(prop.group_fields)) { // For grouplists
                 buildFinalTypeMap(prop.group_fields, map);
             }
             if (prop && prop.textsettings && Array.isArray(prop.textsettings)) { // If textsettings is an array of fields
                 buildFinalTypeMap(prop.textsettings, map);
             }
             // Add other nested possibilities if they exist (e.g., inside lookup columns? unlikely)
        });
    }
    buildFinalTypeMap(flexJson.properties, finalPropTypes); // Populate the map

    // 2. Process the ORIGINAL form data using the type map to build the defaults
    // Pass the original array derived from formData.properties
    buildDefaultsObject(originalPropertyArray, finalPropTypes, flexJson.defaults);

    // 3. Clean up empty defaults object if no defaults were actually set
    if (Object.keys(flexJson.defaults).length === 0) {
        delete flexJson.defaults;
    }

    // --- Write Files ---
    await fs.writeJson(path.join(outputDir, 'flex.json'), flexJson, { spaces: 2 });

    // Basic MVT templates
    const initMvtContent = ``; // Empty or basic init
    const instanceMvtContent = `<!-- Component: ${flexJson.name} (${flexJson.code}) -->\n<div class="${flexJson.code}">\n\t<!-- Instance template for ${flexJson.code} -->\n\tComponent content goes here.\n</div>`;
    await fs.writeFile(path.join(templatesDir, 'init.mvt'), initMvtContent);
    await fs.writeFile(path.join(templatesDir, 'instance.mvt'), instanceMvtContent);


    // Create CSS file if included
    if (include_css === 'true') {
      const cssFileName = `${folderName}.css`;
      const cssContent = `/* Styles for ${flexJson.name} (${flexJson.code}) */\n\n.${flexJson.code} {\n\t/* Add component styles here */\n}`;
      await fs.writeFile(path.join(cssDir, cssFileName), cssContent);
    }

    // Create JS file if included
    if (include_js === 'true') {
      const jsFileName = `${folderName}.js`;
       const jsContent = `// Script for ${flexJson.name} (${flexJson.code})\n\ndocument.addEventListener('DOMContentLoaded', () => {\n\t// Add component script logic here\n\tconsole.log('Component ${flexJson.code} script loaded.');\n});`;
      await fs.writeFile(path.join(jsDir, jsFileName), jsContent);
    }

    // Respond with success
    res.status(200).json({
        message: `Component '${component_name}' generated successfully!`,
        directory: `generated/${folderName}` // Inform client where files are (relative)
    });

  } catch (err) {
    console.error("Error generating component:", err);
    res.status(500).json({ error: 'An error occurred while generating the component.', details: err.message });
  }
});

// Basic route for the root to serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log(`Component Generator UI available at http://localhost:${PORT}`);
});
