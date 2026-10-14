# ServeSmart Website

ServeSmart is a front-end prototype for a surplus food redistribution workflow.

## Files

- `index.html` — website structure and page sections
- `style.css` — responsive layout, visual design, and light/dark themes
- `app.js` — donation form, rule-based demo matching, status management, charts, and CSV export

Keep all three files in the same folder. The links to the CSS and JavaScript are already set in `index.html`.

## Run the website

**Quickest way:** double-click `index.html` to open it in a modern browser.

For a local development server in VS Code, you can also install the Live Server extension, right-click `index.html`, and choose **Open with Live Server**. The website itself does not require Python or Streamlit.

## Features

- Responsive dashboard and navigation
- Register surplus food donations
- Demo recipient matching with visible reasons and scores
- Reserve a listing, cancel it, mark it collected, or restore it
- Impact metrics and charts
- Download donation records as CSV
- Light/dark theme toggle
- Stores demo donation records in the current browser using localStorage

## Important limitations

This is a browser-only demonstration. The recipient organisations, distances, capacities, matching rules, and impact figures are simulated. Data is stored in the browser on this device, not in a shared database. It does not contact real organisations or arrange real pickups. Do not use it for real food-safety decisions without proper verification.

For a public website with multiple users and shared records, you will need hosting plus a backend and database.
