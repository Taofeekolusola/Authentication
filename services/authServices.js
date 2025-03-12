const { default: axios } = require('axios');
const qs = require('qs');
require('dotenv').config();

const getGoogleOauthToken = async (code) => {
  const rootUrl = 'https://oauth2.googleapis.com/token';
  const options = {
    code,
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URL,
    grant_type: 'authorization_code', 
  }
  try {
    const { data } = await axios.post(
      rootUrl,
      qs.stringify(options),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return data;
  } catch (err) {
    console.error('Failed to fetch Google Oauth Tokens', err);
    throw new Error(err);
  }
}

const getGoogleUser = async (idToken, accessToken) => {
  try {
    const { data } = await axios.get(
      `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${accessToken}`,
      {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      }
    );

    return data;
  } catch (err) {
    console.error('Failed to fetch Google user data', err);
    throw new Error(err);
  }
}

module.exports = {
  getGoogleOauthToken,
  getGoogleUser
}