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
function parseProperty(propData) {
  if (!propData || !propData.code || !propData.prompt || !propData.type) {
    console.warn('Skipping incomplete property data:', propData);
    return null; // Skip incomplete properties
  }

  const base = {
    code: propData.code.trim(),
    prompt: propData.prompt.trim(),
    type: propData.type,
  };

  // Add optional string fields if they exist and are not empty
  const stringFields = [
    'placeholder', 'preview_property_selector', 'text_type',
    'validation_pattern', 'validation_message', 'size', 'label',
    'module_code', 'module_function', 'item_type', 'style', 'style_suffix' // Added more
  ];
  stringFields.forEach(field => {
    if (propData[field] && String(propData[field]).trim() !== '') {
      base[field] = String(propData[field]).trim();
    }
  });

   // Boolean fields (check for 'true' string or boolean true)
   const booleanFields = ['required', 'markdown', 'collapsed', 'can_disable'];
   booleanFields.forEach(field => {
       if (propData[field] === 'true' || propData[field] === true) {
           // Miva often uses 1 for true in JSON, adjust if necessary based on spec
           base[field] = true; // Or set to 1 if Miva requires numbers
       }
   });

  // Numeric fields
  const numericFields = ['minlength', 'maxlength', 'min', 'max', 'step'];
  numericFields.forEach(field => {
    if (propData[field] !== undefined && propData[field] !== '') {
      const num = Number(propData[field]);
      if (!isNaN(num)) {
        base[field] = num;
      }
    }
  });

  // Options for select, radio, etc.
  if (['select', 'radio', 'selector'].includes(propData.type) && propData.options && Array.isArray(propData.options)) {
    base.options = propData.options
      .map(opt => (opt && opt.text && opt.value) ? { text: opt.text.trim(), value: opt.value.trim() } : null)
      .filter(opt => opt !== null && opt.text && opt.value); // Ensure both text and value are non-empty
    if (base.options.length === 0) delete base.options; // Remove if empty
  }

  // Pseudoclasses for select/selector (assuming comma-separated input)
   if (['select', 'selector'].includes(propData.type) && propData.pseudoclasses && typeof propData.pseudoclasses === 'string') {
       base.pseudoclasses = propData.pseudoclasses.split(',')
           .map(v => v.trim())
           .filter(Boolean);
       if (base.pseudoclasses.length === 0) delete base.pseudoclasses;
   }


  // Textsettings (check enable flag)
  if (propData.type === 'textsettings' && propData.enable_textsettings === 'true' && propData.textsettings && propData.textsettings.fields && Array.isArray(propData.textsettings.fields)) {
      base.textsettings = {
          fields: propData.textsettings.fields
              .map(fieldData => parseProperty(fieldData)) // Recursively parse nested fields
              .filter(field => field !== null) // Filter out invalid nested fields
      };
      if (base.textsettings.fields.length === 0) delete base.textsettings; // Remove if empty
  }

  // Group/Grouplist Properties (requires recursive parsing)
    if (['group', 'grouplist'].includes(propData.type) && propData.group_fields && Array.isArray(propData.group_fields)) {
        // Assuming group_fields is an array of property data objects
        base.group_fields = propData.group_fields
            .map(fieldData => parseProperty(fieldData))
            .filter(field => field !== null);
        if (base.group_fields.length === 0) delete base.group_fields;
    } else if (propData.type === 'group' && propData.properties && Array.isArray(propData.properties)) {
         // Handle alternative 'properties' key for group if used
         base.properties = propData.properties
            .map(fieldData => parseProperty(fieldData))
            .filter(field => field !== null);
        if (base.properties.length === 0) delete base.properties;
    }


  return base;
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
    properties // This should now be an array/object from qs
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
                if (name && valueArray[index]) {
                    attributes.push({
                        name: name.trim(),
                        value: valueArray[index].trim(),
                    });
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
      initialization_template: "init.mvt", // Standard names
      instance_template: "instance.mvt",   // Standard names
      styles: [],
      scripts: [],
      properties: [] // Initialize properties array
    };
    if (category) { // Only add category if it has a value
        flexJson.category = category;
    }

    // Add styles if included
    if (include_css === 'true') {
      flexJson.styles.push({
        filepath: `src/css/${folderName}.css`,
        resource_code: flexJson.resourcegroup_code,
        attributes: cssAttributes,
      });
    }

    // Add scripts if included
    if (include_js === 'true') {
      flexJson.scripts.push({
        filepath: `src/js/${folderName}.js`,
        resource_code: flexJson.resourcegroup_code,
        attributes: jsAttributes,
      });
    }

    // --- Process Properties ---
    if (properties && typeof properties === 'object') {
        // qs might return an object { '0': {...}, '1': {...} } or an array
        const propertyArray = Array.isArray(properties) ? properties : Object.values(properties);

        flexJson.properties = propertyArray
            .map(propData => parseProperty(propData)) // Use the refined parseProperty
            .filter(prop => prop !== null); // Filter out any null results from incomplete data
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

    // Respond with success - consider sending back the path or a link if desired
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
