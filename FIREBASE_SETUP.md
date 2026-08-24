# Core Firebase Setup

## What Firebase does here

Firebase is the shared backend for Core. It stores your thoughts in the cloud so the same data can appear on iPhone, iPad, and desktop.

## What already exists in this project

- Firebase is installed.
- The app reads configuration from `.env.local`.
- The Firebase client lives in `src/lib/firebase.ts`.
- The Firestore thoughts helper lives in `src/lib/thoughts.ts`.

## What you should do in Firebase Console

1. Open your Firebase project.
2. Go to **Authentication**.
3. Enable an access method. For Core, the easiest next step is email link or Google sign-in.
4. Go to **Firestore Database**.
5. Create the database.
6. Start in test mode only if this is just a local prototype. For a private app, we should later switch to locked-down rules.

## What the app will do next

1. Sign you in.
2. Save a thought to Firestore.
3. Read the thoughts back and show them in the UI.
4. Filter by emotion, place, and date.

## Important note

The `thoughts` collection currently expects these fields:

- `content`
- `emotion`
- `place`
- `userId`
- `createdAt`
- `updatedAt`

## Next coding step

Wire a form to `createThought` and a list view to `listThoughts`.