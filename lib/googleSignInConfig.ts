import { GoogleSignin } from '@react-native-google-signin/google-signin';

const WEB_CLIENT_ID =
  '496533823141-ngb38njinb595ndm6qlu1ollommpg2sl.apps.googleusercontent.com';
const IOS_CLIENT_ID =
  '496533823141-45ea5o2ud652e9gk3dmbfirtrt3t7f5l.apps.googleusercontent.com';

export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
  });
};
