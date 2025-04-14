// config.js

// Reusable field definitions
export const COMMON_FIELDS = [
	{name: "prompt", type: "string"},
	{name: "required", type: "boolean"},
];
export const MIN_MAX_FIELDS = [
	{name: "min", type: "number"},
	{name: "max", type: "number"},
	{name: "step", type: "number"},
];

// Base TYPE_FIELDS definitions without render functions initially
// Render functions will be assigned in renderer.js after import
export const BASE_TYPE_FIELDS = {
	text: [
		...COMMON_FIELDS,
		{name: "code", type: "string", required: true},
		{name: "minlength", type: "number"},
		{name: "maxlength", type: "number"},
		{
			name: "text_type",
			type: "dropdown",
			options: [
				{value: "text", label: "Text"},
				{value: "email", label: "Email"},
				{value: "url", label: "URL"},
				{value: "tel", label: "Telephone"},
				{value: "password", label: "Password"},
				{value: "number", label: "Number (Input Type)"},
				{value: "color", label: "Color"},
			],
			default: "text",
		},
		{name: "placeholder", type: "string"},
		{name: "validation_pattern", type: "string"},
		{name: "validation_message", type: "string"},
		{name: "size", type: "string"},
		{name: "label", type: "string"},
		{name: "visibility_conditions", type: "object"}, // Placeholder
		{name: "preview_property_selector", type: "string"},
		{name: "textsettings", type: "object", renderFunctionName: "renderTextSettingsField"}, // Note: Using function name string
	],
	textarea: [...COMMON_FIELDS, {name: "code", type: "string", required: true}, {name: "placeholder", type: "string"}, {name: "maxlength", type: "number"}, {name: "markdown", type: "boolean"}, {name: "style", type: "string"}, {name: "textsettings", type: "object", renderFunctionName: "renderTextSettingsField"}, {name: "visibility_conditions", type: "object"}, {name: "preview_property_selector", type: "string"}],
	texteditor: [...COMMON_FIELDS, {name: "code", type: "string", required: true}, {name: "minlength", type: "number"}, {name: "maxlength", type: "number"}, {name: "placeholder", type: "string"}, {name: "style", type: "string"}, {name: "visibility_conditions", type: "object"}, {name: "preview_property_selector", type: "string"}],
	number: [...COMMON_FIELDS, {name: "code", type: "string", required: true}, ...MIN_MAX_FIELDS, {name: "placeholder", type: "string"}, {name: "style", type: "string"}, {name: "style_suffix", type: "string"}, {name: "visibility_conditions", type: "object"}, {name: "preview_property_selector", type: "string"}],
	date: [...COMMON_FIELDS, {name: "code", type: "string", required: true}, {name: "placeholder", type: "string"}, {name: "style", type: "string"}, {name: "visibility_conditions", type: "object"}, {name: "preview_property_selector", type: "string"}],
	datetime: [...COMMON_FIELDS, {name: "code", type: "string", required: true}, {name: "placeholder", type: "string"}, {name: "style", type: "string"}, {name: "visibility_conditions", type: "object"}, {name: "preview_property_selector", type: "string"}],
	checkbox: [...COMMON_FIELDS, {name: "code", type: "string", required: true}, {name: "style", type: "string"}, {name: "visibility_conditions", type: "object"}, {name: "preview_property_selector", type: "string"}],
	radio: [
		...COMMON_FIELDS,
		{name: "code", type: "string", required: true},
		{name: "options", type: "custom", renderFunctionName: "renderOptionsField"}, // Use function name string
		{name: "style", type: "string"},
		{name: "visibility_conditions", type: "object"},
		{name: "preview_property_selector", type: "string"},
	],
	select: [...COMMON_FIELDS, {name: "code", type: "string", required: true}, {name: "options", type: "custom", renderFunctionName: "renderOptionsField"}, {name: "style", type: "string"}, {name: "pseudoclasses", type: "string", placeholder: "e.g. normal, hover"}, {name: "visibility_conditions", type: "object"}, {name: "preview_property_selector", type: "string"}],
	selector: [...COMMON_FIELDS, {name: "code", type: "string", required: true}, {name: "options", type: "custom", renderFunctionName: "renderOptionsField"}, {name: "style", type: "string"}, {name: "pseudoclasses", type: "string", placeholder: "e.g. normal, hover"}, {name: "visibility_conditions", type: "object"}, {name: "preview_property_selector", type: "string"}],
	slider: [...COMMON_FIELDS, {name: "code", type: "string", required: true}, ...MIN_MAX_FIELDS, {name: "style", type: "string"}, {name: "style_suffix", type: "string"}, {name: "visibility_conditions", type: "object"}, {name: "preview_property_selector", type: "string"}],
	distributedslider: [...COMMON_FIELDS, {name: "code", type: "string", required: true}, ...MIN_MAX_FIELDS, {name: "style", type: "string"}, {name: "style_suffix", type: "string"}, {name: "visibility_conditions", type: "object"}, {name: "preview_property_selector", type: "string"}],
	customlookup: [...COMMON_FIELDS, {name: "code", type: "string", required: true}, {name: "module_code", type: "string", required: true}, {name: "module_function", type: "string", required: true}, {name: "style", type: "string"}, {name: "visibility_conditions", type: "object"}, {name: "preview_property_selector", type: "string"}],
	productcustomfieldlookup: [...COMMON_FIELDS, {name: "code", type: "string", required: true}, {name: "style", type: "string"}, {name: "visibility_conditions", type: "object"}, {name: "preview_property_selector", type: "string"}],
	image: [
		...COMMON_FIELDS,
		{name: "code", type: "string", required: true},
		{name: "width", type: "number", helpText: "Default width for the image (optional)."},
		{name: "height", type: "number", helpText: "Default height for the image (optional)."},
		{
			name: "responsive_images",
			type: "custom", // Needs custom UI rendering
			renderFunctionName: "renderResponsiveImagesField", // Assign renderer function
			helpText: "Define different image sizes for various breakpoints.",
		},
		{name: "visibility_conditions", type: "object"},
		{name: "preview_property_selector", type: "string"},
	],
	imagetype: [...COMMON_FIELDS, {name: "code", type: "string", required: true}, {name: "visibility_conditions", type: "object"}, {name: "preview_property_selector", type: "string"}],
	fragment: [...COMMON_FIELDS, {name: "code", type: "string", required: true}, {name: "visibility_conditions", type: "object"}, {name: "preview_property_selector", type: "string"}],
	group: [
		{name: "code", type: "string", required: true},
		{name: "prompt", type: "string", helpText: "Label shown for the group header."}, // Renamed from 'label' for consistency
		{name: "collapsed", type: "boolean", helpText: "Start the group collapsed in the UI?"},
		{name: "can_disable", type: "boolean", helpText: "Allow user to enable/disable this group?"},
		{name: "properties", type: "array", isNested: true}, // Mark that this holds nested properties
		{name: "visibility_conditions", type: "object"},
	],
	list: [...COMMON_FIELDS, {name: "code", type: "string", required: true}, {name: "item_type", type: "string", required: true}, {name: "style", type: "string"}, {name: "visibility_conditions", type: "object"}],
	grouplist: [
		...COMMON_FIELDS,
		{name: "code", type: "string", required: true},
		{name: "style", type: "string"},
		{name: "visibility_conditions", type: "object"}, // 'group_fields' definition needed if complex
	],
	textsettings: [
		// Note: This represents the field type *within* another property (like text/textarea)
		...COMMON_FIELDS,
		{name: "code", type: "string", required: true},
		{name: "fields", type: "object", renderFunctionName: "renderTextSettingsField"},
		{name: "visibility_conditions", type: "object"},
	],
};

// Helper function to get fields for a text subtype - keep here as it's config-related
export function getFieldsForTextSubType(textSubtype) {
	switch (textSubtype) {
		case "text":
		case "email":
		case "url":
		case "tel":
		case "password":
			return ["placeholder", "minlength", "maxlength", "validation_pattern", "validation_message", "size"];
		case "number":
			return ["placeholder", "min", "max", "step"];
		case "color":
			return ["placeholder"];
		default:
			return ["placeholder"];
	}
}
