# Miva Flex Component Generator ⚙️

A web-based tool to accelerate the creation of Miva Flex Components by generating the basic `flex.json` configuration file and folder structure through a user-friendly interface.

## Overview

This application provides a dynamic web form where developers can define the metadata, properties, and default values for a Miva Flex Component. It features a live JSON preview that updates as the form is filled, helping to visualize the resulting `flex.json` structure. Upon submission, a backend service generates the necessary component folder, `flex.json` file, and placeholder template/asset files.

## ✨ Features

*   **Dynamic Form UI:** Generates form fields based on selected property types.
*   **Wide Range of Property Types:** Supports common types like `text`, `textarea`, `number`, `select`, `radio`, `checkbox`, `image`, etc.
*   **Nested Structures:** Handles complex types like `group` (with nested properties) and `textsettings` (with nested fields).
*   **Live JSON Preview:** Instantly see the generated `flex.json` structure as you modify the form.
*   **CSS/JS File Inclusion:** Options to include placeholder CSS and JS files in the generated structure.
*   **File Attributes:** Ability to add attributes (like `media`, `defer`, `async`) to CSS and JS file references in `flex.json`.
*   **Responsive Images:** Support for defining multiple sizes within the `image` property type.
*   **Defaults Section:** Dedicated UI section to define default values for properties.
*   **File Generation:** Creates the component directory, `flex.json`, basic `.mvt` templates, and optional CSS/JS files on the server.
*   **Configurable:** Property types and their fields are defined in `config.js` for easier extension.

## 💻 Technology Stack

*   **Backend:** Node.js, Express.js
*   **Frontend:** HTML, CSS, JavaScript (ES Modules)
*   **File System:** fs-extra
*   **Form Parsing:** qs
*   **Dependencies:** See `package.json`

## 🚀 Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/) (includes npm) installed on your system.

### Installation

1.  **Clone the repository (or download the files):**
    ```bash
    git clone <your-repository-url>
    cd miva-component-generator
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Running the Application

1.  **Start the server:**
    ```bash
    node server.js
    ```
2.  **Access the UI:** Open your web browser and navigate to `http://localhost:3000` (or the port specified in the console output).

## 📝 Usage

1.  **Open the Generator:** Navigate to the running application in your browser.
2.  **Component Details:** Fill in the main details for your component (Name, Code, Version, Type, Category, Resource Group Code). Check the boxes if you want placeholder CSS and/or JS files generated, and add any necessary attributes for those files.
3.  **Properties:**
    *   Click the "Add Property" button.
    *   Select the desired `Type` for the property.
    *   Enter the unique `Code` and user-friendly `Prompt`.
    *   Fill in any additional configuration fields that appear based on the selected `Type`.
    *   For `group` types, an "Add Child Property" button will appear to allow nesting.
    *   For types supporting `textsettings` (like `text`, `textarea`), check "Enable Text Settings" to add configurable style fields (e.g., font-size, color). Add fields using the "Add Field" button within the text settings section.
    *   For `image` types, use the "Add Responsive Image Size" button.
    *   Repeat for all required properties.
4.  **Defaults:**
    *   Expand the "Defaults" accordion.
    *   As you add properties with codes in the "Properties" section, corresponding input fields will appear here.
    *   Enter the desired default value for each property. (Note: Complex defaults for groups/lists/textsettings might require manual JSON editing currently).
5.  **JSON Preview:** Observe the live preview on the right side of the screen to ensure the `flex.json` structure matches your expectations.
6.  **Generate:** Click the "Generate Component Files" button.

## 📁 Output Structure

The application will create a new directory inside the `generated/` folder named after your component's code (e.g., `generated/my-component/`). Inside this directory, you will find:

*   `flex.json`: The main configuration file.
*   `src/`: Source directory.
    *   `templates/`: Contains basic `init.mvt` and `instance.mvt` files.
    *   `css/` (if `include_css` checked): Contains `<component-code>.css`.
    *   `js/` (if `include_js` checked): Contains `<component-code>.js`.

## 🔧 Configuration

The available property types and their associated fields are defined in `config.js`. You can extend the generator by:

1.  Adding new property types to the `BASE_TYPE_FIELDS` object.
2.  Adding new fields to existing property types.
3.  Creating new custom rendering functions in `renderer.js` (like `renderOptionsField`) and referencing them via `renderFunctionName` in `config.js`. Remember to add the function name to the `renderFunctionMap` in `renderer.js`.

## 🚧 Limitations & Future Enhancements

*   **Defaults UI:** The current Defaults section only supports simple text inputs. UI enhancements are needed to properly handle defaults for complex types like `options`, `list`, `group`, `grouplist`, and nested `textsettings`.
*   **List/GroupList UI:** The UI for defining the *structure* of `list` items or `grouplist` fields is not implemented.
*   **Validation:** More robust frontend and backend validation could be added.
*   **Packaging:** The backend includes dependencies (`tar`, `compressjs`) suggesting potential future plans to package the output as a `.tar.bz2` archive, but this is not currently implemented in the `/generate` route.
*   **Visibility Conditions:** The UI doesn't currently provide a way to define `visibility_conditions`.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues.

## 📄 License

