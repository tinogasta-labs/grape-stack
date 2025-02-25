import { createCookieSessionStorage } from 'react-router'

export const authSessionStorage = createCookieSessionStorage({
  cookie: {
    name: 'gs-session',
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secrets: process.env.SESSION_SECRET.split(','),
    secure: process.env.NODE_ENV === 'production',
  },
})
