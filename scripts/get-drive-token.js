const { google } = require('googleapis');
const readline = require('readline');

// ==========================================
// PASTE YOUR CLIENT ID AND SECRET HERE
// ==========================================
const CLIENT_ID = 'YOUR_CLIENT_ID_HERE';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET_HERE';
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/drive'];

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent' // Forces it to give us a refresh token
});

console.log('Authorize this app by visiting this url:');
console.log(authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('\nEnter the code from that page here: ', (code) => {
  rl.close();
  oAuth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error retrieving access token', err);
    console.log('\n\n========================================');
    console.log('SUCCESS! Here is your Refresh Token:');
    console.log('========================================\n');
    console.log(token.refresh_token);
    console.log('\n========================================');
    console.log('Add this to your .env file as GOOGLE_REFRESH_TOKEN');
  });
});
