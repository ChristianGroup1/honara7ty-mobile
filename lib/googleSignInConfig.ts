import { GoogleSignin } from '@react-native-google-signin/google-signin';

const WEB_CLIENT_ID =
  '496533823141-ngb38njinb595ndm6qlu1ollommpg2sl.apps.googleusercontent.com';

export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    webClientId: WEB_CLIENT_ID,
  });
};
