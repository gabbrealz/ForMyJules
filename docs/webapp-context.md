<h1 align="center">
  Web Application For My Girlfriend
</h1>

Only me and my girlfriend will use this web app, but we also allow guest users (who go through a registration approval process)

## Features (High-level Overview)

1. Signup with admin approval process
2. Photobooth
    - Choose frame layout -> Configure filters and time between pictures -> Take photos -> Customize frame design
3. Virtual scrapbook
    - Canva-like feature where users can upload assets or choose from what's already uploaded then design scrapbook pages.
4. Gallery
    - Users can upload images, and they will be displayed like a Gallery wall (like Pinterest).
5. Spin the wheel
    - Similar to wheelofnames but designed for couples
6. Music Locker (Mini Spotify)
    - Users can create playlists, search, and play songs.
7. Game inspired by Pou but cat-themed
    - Multiplayer game using WebSockets where we take care of a pet cat
    - When this tab is not active, a mini window of the pet will appear at the side of the screen that we can interact with

## Client

### Tech Specifications
- Vite React
- Typescript
- Tailwind CSS
- Shadcn component library
- Framer motion
- Lucide React

### Deployment
- Vercel

### Directory Structure
```text
src
├── main.tsx
├── Layout.tsx
├── assets/
├── components/
│   ├── ...custom components
│   └── ui/
│       └── ...shadcn components
├── config/
│   ├── brand.ts
│   └── env.ts
├── features/
│   └── ...features/
│       ├── index.ts
│       ├── types.ts (optional)
│       ├── utils.ts (optional)
│       ├── components/
│       ├── hooks/
│       └── services/
├── hooks/
├── layouts/
├── pages/
│   ├── ...pages
│   └── admin/
│       └── ...admin pages
├── routes/
├── services/
├── styles/
└── utils/
```

## Server

### Tech Specifications
- Node + Express
- Typescript
- `express-session` auth
- `express-rate-limit` for throttling
- `cors` for setting CORS headers
- `ws` for Websocket connection
- `mongoose` for requests to database
- `cloudinary` for requests to file storage

### Deployment
- Render Web Service

### Directory Structure
```text
src
├── index.ts
├── config.ts
├── controllers/
├── middlewares/
├── models/
├── routes/
├── scripts/
├── services/
├── sockets/
├── utils/
└── validators/
```

### Other Tech
- MongoDB (w/ MongoDB Atlas)
- Cloudinary

