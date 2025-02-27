if (process.env.MOCKS === 'true') {
  await import('./tests/mocks/index.ts')
}

if (process.env.NODE_ENV === 'production') {
  await import('./build/server/index.js')
} else {
  await import('./server/index.ts')
}
