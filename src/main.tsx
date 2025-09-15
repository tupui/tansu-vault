import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Buffer polyfill for Stellar SDK
import { Buffer } from 'buffer';
(window as any).Buffer = Buffer;
(window as any).global = globalThis;

createRoot(document.getElementById("root")!).render(<App />);
