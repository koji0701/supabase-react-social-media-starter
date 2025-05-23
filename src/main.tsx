import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Add debug logging
console.log("=== 🚀 SupaSocial App Starting ===");
console.log("If you see a blank screen after login:");
console.log("1. Open browser console (F12 or right-click > Inspect > Console)");
console.log("2. Check for errors in red");
console.log("3. Look for auth state changes in logs");

console.log("🔍 Mounting React App...");
createRoot(document.getElementById("root")!).render(<App />);
console.log("🔍 App rendered to DOM");
