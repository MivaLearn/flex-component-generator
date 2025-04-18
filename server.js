// server.js

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
// const tar = require('tar'); // Removed - Not used currently

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(express.static(__dirname)); // Serve index.html, main.js etc. from root
app.use(express.static(path.join(__dirname, 'public'))); // Optional: if you have a public dir
app.use(express.json({ limit: '5mb' })); // *** IMPORTANT: Parse JSON request bodies ***

// --- REMOVED PARSING FUNCTIONS ---
// parseProperty and buildDefaultsObject are no longer needed


// --- /generate Route ---
app.post('/generate', async (req, res) => {
  // The entire flex.json structure is now expected in req.body
  const flexJson = req.body;

  // --- Basic Validation of received JSON ---
  if (!flexJson || typeof flexJson !== 'object') {
    return res.status(400).json({ error: 'Invalid request body. Expected JSON.' });
  }

  const {
    name: component_name, // Use names from flexJson structure
    code: component_code,
    version,
    // type is already in flexJson
    // category is already in flexJson (optional)
    resourcegroup_code, // Use global resource code
    styles, // Array of style objects
    scripts, // Array of script objects
    // properties are already in flexJson
    // defaults are already in flexJson (optional)
  } = flexJson;

  // Validate required top-level fields
  if (!component_name || !component_code || !version || !resourcegroup_code) {
    return res.status(400).json({ error: 'Invalid JSON data. Missing required component details (name, code, version, resourcegroup_code).' });
  }
  // Add more validation as needed (e.g., check formats, array types)
  if (!/^[a-z0-9\-]+$/.test(component_code)) {
     return res.status(400).json({ error: 'Invalid JSON data. Component Code can only contain lowercase letters, numbers, and hyphens.' });
  }
   if (!/^\d+\.\d+\.\d+$/.test(version)) {
     return res.status(400).json({ error: 'Invalid JSON data. Version must be in semantic format (e.g., 1.0.0).' });
  }
  if (!Array.isArray(styles) || !Array.isArray(scripts) || !Array.isArray(flexJson.properties)) {
      return res.status(400).json({ error: 'Invalid JSON data. styles, scripts, and properties must be arrays.'});
  }


  // --- File/Folder Generation Logic (uses validated flexJson) ---
  const folderName = component_code.toLowerCase();
  const outputDir = path.join(__dirname, 'generated', folderName);
  const srcDir = path.join(outputDir, 'src');
  const templatesDir = path.join(srcDir, 'templates');
  const cssDir = path.join(srcDir, 'css');
  const jsDir = path.join(srcDir, 'js');

  try {
    // Ensure base directories exist
    await fs.ensureDir(templatesDir);

    // Write flex.json
    await fs.writeJson(path.join(outputDir, 'flex.json'), flexJson, { spaces: 2 });

    // Basic MVT templates
    const initMvtContent = ``; // Empty or basic init
    const instanceMvtContent = `<!-- Component: ${flexJson.name} (${flexJson.code}) -->\n<div class="${flexJson.code}">\n\t<!-- Instance template for ${flexJson.code} -->\n\tComponent content goes here.\n</div>`;
    await fs.writeFile(path.join(templatesDir, 'init.mvt'), initMvtContent);
    await fs.writeFile(path.join(templatesDir, 'instance.mvt'), instanceMvtContent);


    // Create CSS file(s) if specified in styles array
    if (Array.isArray(styles)) {
        for (const styleEntry of styles) {
            if (styleEntry && styleEntry.filepath) {
                 const cssFilePath = path.join(outputDir, styleEntry.filepath); // Path is relative to outputDir
                 await fs.ensureDir(path.dirname(cssFilePath)); // Ensure directory exists
                 const cssContent = `/* Styles for ${flexJson.name} (${flexJson.code}) */\n\n.${flexJson.code} {\n\t/* Add component styles here */\n}`;
                 await fs.writeFile(cssFilePath, cssContent);
            }
        }
    }


    // Create JS file(s) if specified in scripts array
     if (Array.isArray(scripts)) {
        for (const scriptEntry of scripts) {
             if (scriptEntry && scriptEntry.filepath) {
                 const jsFilePath = path.join(outputDir, scriptEntry.filepath); // Path is relative to outputDir
                 await fs.ensureDir(path.dirname(jsFilePath)); // Ensure directory exists
                 const jsContent = `// Script for ${flexJson.name} (${flexJson.code})\n\ndocument.addEventListener('DOMContentLoaded', () => {\n\t// Add component script logic here\n\tconsole.log('Component ${flexJson.code} script loaded.');\n});`;
                 await fs.writeFile(jsFilePath, jsContent);
             }
        }
    }

    // Respond with success
    res.status(200).json({
        message: `Component '${component_name}' generated successfully!`,
        directory: `generated/${folderName}` // Inform client where files are (relative)
        // Consider adding a download link/mechanism in future if needed
    });

  } catch (err) {
    console.error("Error generating component files:", err);
    res.status(500).json({ error: 'An error occurred while generating the component files.', details: err.message });
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
