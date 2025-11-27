import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAkwRHhXGAdcsELt6j_31J5ZIh8mXloV54",
  authDomain: "kanban-relax.firebaseapp.com",
  projectId: "kanban-relax",
  storageBucket: "kanban-relax.firebasestorage.app",
  messagingSenderId: "166140630740",
  appId: "1:166140630740:web:99606793c82d9a21ce4d41"
};

console.log("Initializing Firebase...");
try {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  console.log("Firebase initialized.");

  console.log("Testing Firestore connection...");
  // Try to fetch 'cards' collection. If it doesn't exist, it should still return empty snapshot, not error (unless permission denied).
  const querySnapshot = await getDocs(collection(db, "cards"));
  console.log("Connection successful! Found " + querySnapshot.size + " documents.");
} catch (error) {
  console.error("Connection failed:", error);
  if (error.code) {
      console.error("Error Code:", error.code);
  }
}
