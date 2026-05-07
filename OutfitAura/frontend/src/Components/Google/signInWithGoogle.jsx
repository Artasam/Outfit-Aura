// src/components/Google/signInWithGoogle.js
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../../firebase";

const provider = new GoogleAuthProvider();

const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    alert(`Welcome, ${user.displayName}`);
    // You can store user info or redirect here
  } catch (error) {
    console.error("Google sign-in error", error);
    alert("Google sign-in failed!");
  }
};

export default signInWithGoogle;
