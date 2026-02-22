#  Manolog — A Log for Your Mind

Manolog is an AI-assisted mental wellness journaling app designed to help users reflect, track emotions, and gain insights into their mental patterns.
It combines daily journaling, mood tracking, and conversational AI support to encourage self-awareness and emotional well-being.


##  Features

* **Daily Reflection Journal** — Write and store personal thoughts securely
* **Mood Selector** — Log emotional state alongside each entry
* **AI Wellness Companion** — Supportive conversation for reflection and clarity
* **Mood Trends Dashboard** — Visualize emotional patterns over time
* **User Authentication** — Secure, personalized experience
* **Entry History** — Revisit past reflections anytime
* **Insight Generation** — AI summarizes emotional tone and patterns


## Project Structure

```
Manolog/
│
├── app/                # Expo Router screens (file-based routing)
├── components/         # Reusable UI components
├── services/           # API + AI integration logic
├── assets/             # Fonts, icons, images
└── backend/            # Optional external API (if used)
```

## Tech Stack

| Layer          | Technology                             |
| -------------- | -------------------------------------- |
| Mobile App     | React Native + Expo                    |
| Routing        | Expo Router                            |
| Backend/API    | Node.js / Express                      |
| AI Integration | LLM API (emotional insight + chat)     |
| Database       | MongoDB / Prisma (journal + mood data) |
| Auth           | Firebase Authentication                |



## How It Works?

1. User writes a journal reflection.
2. User selects their mood for the day.
3. Entry is securely stored in the database.
4. AI analyzes tone and provides supportive insight.
5. Mood + entries contribute to trend visualization.
6. User can chat with the wellness companion anytime.


## Getting Started (Local Development)

### 1. Install Dependencies

```
npm install
```

### 2. Start the Development Server

```
npx expo start
```

You can then open the app in:

* Android Emulator
* Physical Device using **Expo Go**

## Resetting the Project

If you want a clean slate while keeping the reference implementation:

```
npm run reset-project
```

This moves the starter example into `app-example/` and creates a blank `/app` directory for fresh development.


## AI Role in Manolog

The AI component is designed to:

* Detect emotional tone in journal text
* Offer reflective prompts (not advice)
* Encourage mindful self-expression
* Provide conversational support

This is not therapy or diagnosis — it is a guided self-reflection tool.


##  Future Improvements

* Offline journaling sync
* Emotion-aware recommendations
* Voice-to-journal input
* Advanced mood analytics
* End-to-end encryption for privacy
* Cross-platform web version


## Built For

A practical exploration of:

* Human-centered AI applications
* Mobile-first mental wellness tools
* Real-world React Native architecture
* Emotion-aware computing systems

