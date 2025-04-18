// config.js

// This file defines the structure and attributes associated with different
// component property types used in the Miva Page Builder interface.

// --- Reusable Field Groups ---

// Common fields applicable to many property types.
export const COMMON_FIELDS = [
	{ name: "prompt", type: "string", helpText: "Label displayed for the property in the admin UI." }, // User-facing label
	{ name: "required", type: "boolean", helpText: "Is a value mandatory for this property?" },      // Whether the property must have a value
];

// Fields related to minimum, maximum, and step values, typically for numeric inputs.
export const MIN_MAX_FIELDS = [
	{ name: "min", type: "number", helpText: "Minimum allowed value." },     // Minimum value constraint
	{ name: "max", type: "number", helpText: "Maximum allowed value." },     // Maximum value constraint
	{ name: "step", type: "number", helpText: "Increment/decrement step." }, // Step value for inputs like sliders or number fields
];

// --- Base Property Type Definitions ---
// Defines the configurable attributes for each property type (e.g., 'text', 'image', 'group').
// - `name`: The internal identifier for the attribute.
// - `type`: The expected data type ('string', 'boolean', 'number', 'dropdown', 'custom', 'object', 'array').
// - `required`: (boolean) Indicates if the attribute itself is mandatory for the property type definition.
// - `options`: (array) For 'dropdown' type, provides the available choices ({value, label}).
// - `default`: Default value for 'dropdown' type.
// - `placeholder`: Placeholder text for input fields.
// - `helpText`: Tooltip displayed in the generator UI.
// - `renderFunctionName`: (string) Name of a function in renderer.js used for custom UI rendering (e.g., for 'options' or 'textsettings').
// - `isNested`: (boolean, for 'array' type) Indicates this holds nested properties (used for groups/lists).

export const BASE_TYPE_FIELDS = {
	// --- Simple Input Types ---
	text: [
		...COMMON_FIELDS, // Includes prompt, required
		{ name: "code", type: "string", required: true, helpText: "Unique identifier for this property." }, // Property's unique code
		{
			name: "text_type", // Specific HTML input type attribute (e.g., 'email', 'number')
			type: "dropdown",
			options: [
				{ value: "text", label: "Text" },
				{ value: "email", label: "Email" },
				{ value: "url", label: "URL" },
				{ value: "tel", label: "Telephone" },
				{ value: "password", label: "Password" },
				{ value: "number", label: "Number (Input Type)" }, // Note: Separate from property type 'number'
				{ value: "color", label: "Color" },
			],
			default: "text",
            helpText: "Sets the HTML5 input type attribute."
		},
		{ name: "placeholder", type: "string", helpText: "Placeholder text within the input field." },
		{ name: "size", type: "string", helpText: "HTML 'size' attribute (visual width in characters)." },
        { name: "minlength", type: "number", helpText: "Minimum required characters (for text_type text, email, etc.)." },
        { name: "maxlength", type: "number", helpText: "Maximum allowed characters (for text_type text, email, etc.)." },
        { name: "validation_pattern", type: "string", helpText: "Regex pattern for input validation." },
        { name: "validation_message", type: "string", helpText: "Error message shown if pattern fails." },
		// { name: "label", type: "string" }, // Often redundant with 'prompt', consider removing or clarifying use case
		{ name: "visibility_conditions", type: "object", helpText: "Define conditions for when this property is shown/hidden (Advanced - not fully implemented in UI)." }, // Placeholder for future feature
		{ name: "preview_property_selector", type: "string", helpText: "CSS selector to update in live preview (Advanced)." }, // Placeholder for future feature
		{ name: "textsettings", type: "object", renderFunctionName: "renderTextSettingsField", helpText: "Configure associated CSS style settings (e.g., font-size, color)." }, // Enables linking styles
	],
	textarea: [
		...COMMON_FIELDS,
		{ name: "code", type: "string", required: true, helpText: "Unique identifier for this property." },
		{ name: "placeholder", type: "string", helpText: "Placeholder text within the textarea." },
		{ name: "maxlength", type: "number", helpText: "Maximum allowed characters." },
		{ name: "markdown", type: "boolean", helpText: "Enable Markdown support for this field?" }, // Flag for Markdown rendering
		{ name: "validation_pattern", type: "string", helpText: "Regex pattern for input validation." },
		{ name: "validation_message", type: "string", helpText: "Error message shown if pattern fails." },
		// { name: "style", type: "string" }, // Consider if needed or handled by textsettings
		{ name: "textsettings", type: "object", renderFunctionName: "renderTextSettingsField", helpText: "Configure associated CSS style settings." },
		{ name: "visibility_conditions", type: "object", helpText: "Conditions for showing/hiding this property (Advanced)." },
		{ name: "preview_property_selector", type: "string", helpText: "CSS selector for live preview (Advanced)." }
	],
	texteditor: [ // Rich Text Editor (WYSIWYG)
		...COMMON_FIELDS,
		{ name: "code", type: "string", required: true, helpText: "Unique identifier for this property." },
		// { name: "prompt", type: "string" }, // Already in COMMON_FIELDS
		{ name: "placeholder", type: "string", helpText: "Placeholder text shown when the editor is empty." },
		{ name: "visibility_conditions", type: "object", helpText: "Conditions for showing/hiding this property (Advanced)." },
		{ name: "preview_property_selector", type: "string", helpText: "CSS selector for live preview (Advanced)." }
	],
	date: [
		...COMMON_FIELDS,
		{ name: "code", type: "string", required: true, helpText: "Unique identifier for this property." },
		...MIN_MAX_FIELDS, // Includes min, max date constraints
		// { name: "step", type: "number" }, // 'step' is less common for standard date pickers
		{ name: "serverdate", type: "boolean", helpText: "Use server's date/time instead of user's?" }, // Flag for server time zone
		{ name: "validation_pattern", type: "string", helpText: "Regex pattern for validation (rarely used for date)." },
		{ name: "validation_message", type: "string", helpText: "Error message for validation." },
		{ name: "visibility_conditions", type: "object", helpText: "Conditions for showing/hiding this property (Advanced)." },
		{ name: "preview_property_selector", type: "string", helpText: "CSS selector for live preview (Advanced)." }
	],
	datetime: [ // Combined Date and Time Picker
		...COMMON_FIELDS,
		{ name: "code", type: "string", required: true, helpText: "Unique identifier for this property." },
		{ name: "placeholder", type: "string", helpText: "Placeholder text for the datetime input." },
		// { name: "style", type: "string" }, // Consider if needed
		{ name: "visibility_conditions", type: "object", helpText: "Conditions for showing/hiding this property (Advanced)." },
		{ name: "preview_property_selector", type: "string", helpText: "CSS selector for live preview (Advanced)." }
	],
	checkbox: [
		...COMMON_FIELDS,
		{ name: "code", type: "string", required: true, helpText: "Unique identifier for this property." },
		{ name: "visibility_conditions", type: "object", helpText: "Conditions for showing/hiding this property (Advanced)." },
		{ name: "preview_property_selector", type: "string", helpText: "CSS selector for live preview (Advanced)." }
	],

	// --- Selection Types ---
	radio: [ // Radio Button Group
		...COMMON_FIELDS,
		{ name: "code", type: "string", required: true, helpText: "Unique identifier for this property." },
		{ name: "options", type: "custom", renderFunctionName: "renderOptionsField", helpText: "Define the available radio button options (text/value pairs)." }, // Custom UI for options
		{ name: "visibility_conditions", type: "object", helpText: "Conditions for showing/hiding this property (Advanced)." },
		{ name: "preview_property_selector", type: "string", helpText: "CSS selector for live preview (Advanced)." },
	],
	select: [ // Dropdown Select Box
		...COMMON_FIELDS,
		{ name: "code", type: "string", required: true, helpText: "Unique identifier for this property." },
		{ name: "options", type: "custom", renderFunctionName: "renderOptionsField", helpText: "Define the dropdown options (text/value pairs)." }, // Custom UI for options
		{ name: "visibility_conditions", type: "object", helpText: "Conditions for showing/hiding this property (Advanced)." },
		{ name: "preview_property_selector", type: "string", helpText: "CSS selector for live preview (Advanced)." }
	],
	selector: [ // Visual Selector (e.g., buttons, swatches)
		...COMMON_FIELDS,
		{ name: "code", type: "string", required: true, helpText: "Unique identifier for this property." },
		{ name: "options", type: "custom", renderFunctionName: "renderOptionsField", helpText: "Define the selector options (text/value pairs)." }, // Custom UI for options
		{ name: "pseudoclasses", type: "string", placeholder: "e.g., normal, hover", helpText: "Comma-separated list of pseudo-classes for styling states (e.g., normal, hover, active)." }, // For styling different states
		{ name: "visibility_conditions", type: "object", helpText: "Conditions for showing/hiding this property (Advanced)." },
		{ name: "preview_property_selector", type: "string", helpText: "CSS selector for live preview (Advanced)." }
	],

	// --- Numeric Range Types ---
	slider: [ // Standard Range Slider
		...COMMON_FIELDS,
		{ name: "code", type: "string", required: true, helpText: "Unique identifier for this property." },
		{ name: "label", type: "string", helpText: "Optional label displayed near the slider." }, // Can be useful for units (e.g., "px")
		...MIN_MAX_FIELDS, // Includes min, max, step
		{ name: "precision", type: "number", helpText: "Number of decimal places to display/use." }, // Decimal precision
		{ name: "visibility_conditions", type: "object", helpText: "Conditions for showing/hiding this property (Advanced)." },
		{ name: "preview_property_selector", type: "string", helpText: "CSS selector for live preview (Advanced)." }
	],
	distributedslider: [ // Slider with discrete steps/breaks
		...COMMON_FIELDS,
		{ name: "code", type: "string", required: true, helpText: "Unique identifier for this property." },
		...MIN_MAX_FIELDS, // Includes min, max
		// { name: "step" }, // Typically not used with distributedslider, 'breaks' define the points
		{ name: "breaks", type: "number", helpText: "Number of discrete points/breaks on the slider." }, // Defines selectable points
		{ name: "visibility_conditions", type: "object", helpText: "Conditions for showing/hiding this property (Advanced)." },
		{ name: "preview_property_selector", type: "string", helpText: "CSS selector for live preview (Advanced)." }
	],

	// --- Lookup Types ---
	customlookup: [ // Modal window for selecting custom data
        // No COMMON_FIELDS here as prompt/required are handled slightly differently or within 'lookup'
		{ name: "code", type: "string", required: true, helpText: "Unique identifier for this property." },
        { name: "prompt", type: "string", helpText: "Label displayed for the property in the admin UI." }, // Prompt is still useful
        { name: "required", type: "boolean", helpText: "Is a selection required?" }, // Required flag applies to the selection itself
		{
			name: "lookup", // Container object for all lookup-specific settings
			type: "custom", // Indicates custom rendering logic is needed
			renderFunctionName: "renderCustomLookupField", // Function in renderer.js
			helpText: "Configure the module, function, columns, and behavior of the custom data lookup modal."
		},
		{ name: "visibility_conditions", type: "object", helpText: "Conditions for showing/hiding this property (Advanced)." },
		{ name: "preview_property_selector", type: "string", helpText: "CSS selector for live preview (Advanced)." }
	],
	productcustomfieldlookup: [ // Specific lookup for product custom fields (less configuration needed)
		...COMMON_FIELDS,
		{ name: "code", type: "string", required: true, helpText: "Unique identifier for this property." },
		// { name: "style", type: "string" }, // Consider if needed
		{ name: "visibility_conditions", type: "object", helpText: "Conditions for showing/hiding this property (Advanced)." },
		{ name: "preview_property_selector", type: "string", helpText: "CSS selector for live preview (Advanced)." }
	],

	// --- Media Types ---
	image: [
		...COMMON_FIELDS,
		{ name: "code", type: "string", required: true, helpText: "Unique identifier for this property." },
		{ name: "width", type: "number", helpText: "Default width attribute for the image tag (optional)." },
		{ name: "height", type: "number", helpText: "Default height attribute for the image tag (optional)." },
		{
			name: "responsive_images", // Configuration for different image versions/sizes
			type: "custom", // Needs custom UI rendering
			renderFunctionName: "renderResponsiveImagesField", // Function in renderer.js
			helpText: "Define different image sources/settings for various screen sizes or contexts (e.g., mobile, desktop).",
		},
		{ name: "visibility_conditions", type: "object", helpText: "Conditions for showing/hiding this property (Advanced)." },
		{ name: "preview_property_selector", type: "string", helpText: "CSS selector for live preview (Advanced)." },
	],
	imagetype: [ // Selector for Miva's built-in image types (e.g., 'main', 'thumbnail')
		...COMMON_FIELDS,
		{ name: "code", type: "string", required: true, helpText: "Unique identifier for this property." },
		{ name: "visibility_conditions", type: "object", helpText: "Conditions for showing/hiding this property (Advanced)." },
		{ name: "preview_property_selector", type: "string", helpText: "CSS selector for live preview (Advanced)." }
	],

	// --- Structural Types ---
	fragment: [ // Represents a reusable piece of MVT code or content
		...COMMON_FIELDS,
		{ name: "code", type: "string", required: true, helpText: "Unique identifier for this property." },
		{ name: "visibility_conditions", type: "object", helpText: "Conditions for showing/hiding this property (Advanced)." },
		{ name: "preview_property_selector", type: "string", helpText: "CSS selector for live preview (Advanced)." }
	],
	group: [ // Container for nesting other properties
        // No COMMON_FIELDS directly; prompt/required have specific meanings here.
		{ name: "code", type: "string", required: true, helpText: "Unique identifier for this group." },
		{ name: "prompt", type: "string", helpText: "Label shown for the group header/section in the admin UI." }, // Group's label
		{ name: "collapsed", type: "boolean", helpText: "Should the group start collapsed in the UI?" }, // Initial collapsed state
		{ name: "can_disable", type: "boolean", helpText: "Allow the user to enable/disable this entire group via a checkbox?" }, // Enable/disable toggle for the group
		{ name: "properties", type: "array", isNested: true, helpText: "Child properties contained within this group." }, // Holds the nested properties
		{ name: "visibility_conditions", type: "object", helpText: "Conditions for showing/hiding this group (Advanced)." },
	],
	list: [ // Defines a repeatable list of items (simple or complex)
		...COMMON_FIELDS, // prompt/required apply to the list itself
		{ name: "code", type: "string", required: true, helpText: "Unique identifier for this list property." },
		{
			name: "list_type", // Defines the type of items in the list
			type: "dropdown",
			options: [ // Allowable item types
				{ value: "text", label: "Text" }, { value: "image", label: "Image" },
				{ value: "product", label: "Product" }, { value: "category", label: "Category" },
				{ value: "link", label: "Link" }, { value: "date", label: "Date" },
				{ value: "datetime", label: "Datetime" }, { value: "color", label: "Color" },
				{ value: "group", label: "Group (Complex Items)" }, // Indicates items are defined by nested 'properties'
			],
			default: "text",
            helpText: "Determines the data type or structure of each item in the list."
		},
		{ name: "min_count", type: "number", helpText: "Minimum number of items required in the list." }, // Minimum item count constraint
		{ name: "max_count", type: "number", helpText: "Maximum number of items allowed in the list." }, // Maximum item count constraint
		{ name: "item_prompt_property", type: "string", helpText: "If list_type is 'group', use this child property's value as the label for each list item in the admin UI." }, // Which nested property provides the item label
		{ name: "group_prompt", type: "string", helpText: "Label used for the 'Add Item' button (e.g., 'Add Slide')." }, // Text for the add button
		{ name: "properties", type: "array", isNested: true, helpText: "Define the fields for each item when list_type is 'group'." }, // Holds nested properties for complex list items
		// { name: "style", type: "string" }, // Consider if needed
		{ name: "visibility_conditions", type: "object", helpText: "Conditions for showing/hiding this list (Advanced)." },
	],
	// grouplist: [ ... ] // Grouplist is often similar to list with list_type:'group', potentially deprecated or specialized. Included for reference if needed.

    // --- Special Internal Types (Handled by other properties) ---
	// textsettings: [ ... ] // Not a top-level property type, but an attribute *within* types like 'text', 'textarea'. Handled via renderFunctionName.

};

// --- Helper Function ---

/**
 * Determines which specific configuration fields are relevant for a 'text' property,
 * based on its selected 'text_type' (e.g., 'email' needs 'placeholder', 'number' needs 'min'/'max'/'step').
 * This is used by the renderer to dynamically show/hide the appropriate input fields.
 * @param {string} textSubtype - The value selected for the 'text_type' dropdown (e.g., 'email', 'number', 'color').
 * @returns {string[]} - An array of field names relevant to the given text subtype.
 */
export function getFieldsForTextSubType(textSubtype) {
	switch (textSubtype) {
		case "text":
		case "email":
		case "url":
		case "tel":
		case "password":
			// Standard text-like inputs share these attributes.
			return ["placeholder", "minlength", "maxlength", "validation_pattern", "validation_message", "size"];
		case "number":
			// Number input type uses numeric constraints.
			return ["placeholder", "min", "max", "step", "validation_pattern", "validation_message"];
		case "color":
			// Color input type mainly uses placeholder.
			return ["placeholder"];
		default:
			// Default fallback (should ideally not be reached if textSubtype is valid).
			return ["placeholder"];
	}
}
