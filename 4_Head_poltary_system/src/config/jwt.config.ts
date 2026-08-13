export default () => ({
  jwt: {
    secret: process.env.JWT_SECRET || 'secret',
    accessTokenTtl: process.env.JWT_ACCESS_TOKEN_TTL || '15m',
    refreshTokenTtl: process.env.JWT_REFRESH_TOKEN_TTL || '7d',
  },
});
