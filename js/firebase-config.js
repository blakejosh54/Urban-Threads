import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCZqjzFGe4ZF4za6TyoIXsW8uxHfH8_nbc",
  authDomain: "urbanthreads-8b1ec.firebaseapp.com",
  projectId: "urbanthreads-8b1ec",
  storageBucket: "urbanthreads-8b1ec.firebasestorage.app",
  messagingSenderId: "239298247977",
  appId: "1:239298247977:web:3a01db445d101738c54b38",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
