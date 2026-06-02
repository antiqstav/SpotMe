import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// 🔴 Replace these with your actual Firebase project credentials
// Go to: Firebase Console → Project Settings → Your Apps → SDK setup
const firebaseConfig = {
  apiKey: "AIzaSyBuIxii177mgqlLpicp479m3Cw-r8oXmOc",
  authDomain: "spot-6e5ad.firebaseapp.com",
  projectId: "spot-6e5ad",
  messagingSenderId: "237936986591",
  appId: "1:237936986591:web:b7eeac92dedb68d2019c6a"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export default app