const verifyIdToken = jest.fn(async ({ idToken }) => {
  if (idToken === 'invalid-token') {
    throw new Error('Invalid Google token');
  }
  if (idToken === 'unverified-email-token') {
    return {
      getPayload: () => ({
        email: 'unverified@example.com',
        email_verified: false,
        sub: 'google-sub-unverified',
        name: 'Unverified User'
      })
    };
  }
  return {
    getPayload: () => ({
      email: idToken === 'existing-user-token' ? 'existing@example.com' : 'googleuser@example.com',
      email_verified: true,
      sub: idToken === 'existing-user-token' ? 'google-sub-existing' : 'google-sub-123',
      name: 'Google User',
      picture: 'https://example.com/avatar.png'
    })
  };
});

class OAuth2Client {
  constructor() {}
  verifyIdToken(opts) {
    return verifyIdToken(opts);
  }
}

module.exports = { OAuth2Client, __verifyIdToken: verifyIdToken };
