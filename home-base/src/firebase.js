import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyB4QqGkrWiukTIf8Fs0Nykyy3peRiuA29Q",
    authDomain: "homebase-220b0.firebaseapp.com",
    projectId: "homebase-220b0",
    storageBucket: "homebase-220b0.firebasestorage.app",
    messagingSenderId: "216499715918",
    appId: "1:216499715918:web:b0457d7ee903b24d35a81f",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();


auth.useDeviceLanguage();

export { auth, googleProvider };