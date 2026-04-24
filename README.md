# La Mia Cucina

A personal kitchen management application for tracking pantry inventory, freezer meals, and weekly meal planning.

## Features

- **Pantry Management:** Track ingredients and recipe components.
- **Freezer Inventory:** Dedicated tracking for "Ready Made Meals" and ingredients.
- **Meal Planner:** Weekly calendar to schedule meals from your recipes or freezer.
- **Recipe Scraper:** Import recipes directly from your favorite websites.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/)

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd mia-cucina
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Copy the example environment file and fill in your details (SMTP for password reset functionality, etc.).
   ```bash
   cp .env.example .env
   ```

4. **Database Initialization:**
   The application uses SQLite and initializes the database automatically on the first run. No separate initialization steps are required.

5. **Run the application:**
   For development:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for signing JWT tokens | `mia-cucina-jwt-secret-dev` |
| `DATABASE_URL` | Path to the SQLite database file | `database.sqlite` |
| `SMTP_HOST` | SMTP server host for emails | - |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP server username | - |
| `SMTP_PASS` | SMTP server password | - |
| `VITE_APP_URL` | Base URL of the application | `http://localhost:3000` |

## Scripts

- `npm run dev`: Starts the server with TypeScript and Vite middleware for local development.
- `npm run build`: Compiles the frontend for production.
- `npm start`: Runs the built server (production mode).
- `npm run lint`: Runs TypeScript type checking.

## Tech Stack

- **Frontend:** React, Tailwind CSS, Lucide Icons, Framer Motion.
- **Backend:** Node.js, Express, Better-SQLite3.
- **Tooling:** Vite, tsx, TypeScript.
