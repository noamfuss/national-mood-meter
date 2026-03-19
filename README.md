# 🇮🇱 National Mood Meter (מד מצב הרוח הלאומי)

Because in Israel, "How are you?" is a geopolitical question.

## What is this?
The **National Mood Meter** is a statistically questionable, emotionally volatile tool that reads real-time news headlines from major Israeli outlets (Ynet, Walla, Mako, Maariv) and tells you exactly how stressed you should be on a scale of "Everything is fine" to "Get into the shelter"

By using AI-powered sentiment analysis via Google Gemini, we provide a definitive, scientific* metric for the collective Israeli psyche

*\*Not scientific at all. Please don't use this for actual decisions*

## Features
- **Real-time Stress Gauge**: A beautifully animated needle that vibrates with the intensity of news notifications.
- **Headline Impact Feed**: See which specific news items are single-handedly ruining your day.
- **The Boom Button**: For those moments when you just need to feel something.
- **AI Sentiment Analysis**: Integration with Google Gemini to understand the nuance between "slightly concerning" and "catastrophic."
- **Home front Command Alerts**: Real-time updates on which zones are currently under threat, so you can panic accordingly.

---

## Getting Started

### Method 1: Docker Compose (The Easy Way)
If you have Docker and Docker Compose installed:

1. **Clone the repo**:
   ```bash
   git clone https://github.com/noamfuss/national-mood-meter.git
   cd national-mood-meter
   ```

2. **Configure (Optional)**:
   Add your API key to `backend/.env` if you want AI-powered stress:
   ```env
   GEMINI_API_KEY=your_key_here
   ```

3. **Spin it up**:
   ```bash
   docker compose -f simple-compose.yaml up
   ```
   Access the app at `http://localhost:8080` (or your configured proxy URL).

### Method 2: Manual Setup (The Hard Way)

#### Backend (Python)
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create a virtual environment and install dependencies:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows use `.venv\Scripts\activate`
   pip install -r requirements.txt
   ```
3. Run the FastAPI server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

#### Frontend (Node.js)
1. Navigate to the project root:
   ```bash
   cd ..
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:8080`.

---

## Tech Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Framer Motion, shadcn/ui.
- **Backend**: Python, FastAPI, sqlite.
- **Worker**: Python, Feedparser, Google Generative AI.
- **Deployment**: Docker, Docker Compose, Nginx.

## How it works
Every 10 minutes, the worker scans rss feeds of multiple Israeli news websites, and use gemini to deduplicate and rate them, and finally save them to a file (and logs each headline to a sqlite db). Then the backend serves that data to the frontend, in addition to home front command's (פיקוד העורף) alerts zones.  
This arcitecture ensures that this project won't consume too many tokens, so even a free api key can be used. Additionally, every data read from the db is cached in memory for 10 minutes, to allow for even more scalability.

## License
MIT - Use it, fork it, just don't blame us for your rising blood pressure.
