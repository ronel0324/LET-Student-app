import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBQemMUkHddwZWMc6JZlZhukFfGsJVy3CQ",
  authDomain: "let-project-f4452.firebaseapp.com",
  projectId: "let-project-f4452",
  storageBucket: "let-project-f4452.firebasestorage.app",
  messagingSenderId: "130835780174",
  appId: "1:130835780174:web:b63dcf8289d5c59774a91f",
  measurementId: "G-YT3HV9YHGC",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

// OFFLINE SUPPORT
enableIndexedDbPersistence(db)
  .then(() => {
    console.log("Offline persistence enabled");
  })
  .catch((err) => {
    console.log(err);
  });
