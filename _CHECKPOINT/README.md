# SkinScan AI - Local Development Setup

This project is a static HTML/CSS/JS web application. To run it locally, you should use a local development server to ensure all file paths and assets load correctly.

## Prerequisites
- A modern web browser (Chrome, Firefox, Edge, etc.)
- Internet connection (for loading Fonts and Icons from CDNs)

## Option 1: VS Code Live Server (Recommended)
If you are using Visual Studio Code:
1.  Open the **Extensions** view (`Ctrl+Shift+X`).
2.  Search for **Live Server** (by Ritwick Dey) and install it.
3.  Open `login.html` or `index.html` in the editor.
4.  Click the **Go Live** button at the bottom right of the VS Code window.
5.  The project will open automatically in your browser (usually at `http://127.0.0.1:5500/login.html`).

## Option 2: Python HTTP Server
If you have Python installed, you can use its built-in server:
1.  Open your terminal or command prompt.
2.  Navigate to the project directory:
    ```bash
    cd "d:/Project/FIREBASE"
    ```
3.  Run the command:
    ```bash
    python -m http.server 8000
    ```
4.  Open your browser and restart `http://localhost:8000/login.html`.

## Option 3: Node.js (npx)
If you have Node.js installed:
1.  Open your terminal.
2.  Navigate to the project directory.
3.  Run one of the following commands:
    ```bash
    npx serve
    # OR
    npx http-server
    ```
4.  Follow the link shown in the terminal (usually `http://localhost:3000` or `http://localhost:8080`).

## File Structure
-   `login.html`: Entry point (Login page).
-   `index.html`: Main dashboard.
-   `login.css`: Styles for the login page.
-   `style.css`: Styles for the dashboard.
-   `script.js`: Contains logic for both pages.
