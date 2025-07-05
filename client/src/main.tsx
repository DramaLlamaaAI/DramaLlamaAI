import { createRoot } from "react-dom/client";
import App from "./App.js";
import "./index.css";
import { Helmet, HelmetProvider } from 'react-helmet-async';

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <Helmet>
      <title>Drama Llama - AI Powered Communication Analysis</title>
      <meta name="description" content="Drama Llama uses AI to analyze conversations, detect emotional tones, and provide clarity on communication dynamics." />
      <meta property="og:title" content="Drama Llama - AI Powered Communication Analysis" />
      <meta property="og:description" content="Get insights on your conversations with our AI-powered analysis tool." />
      <meta property="og:type" content="website" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@600;700&family=Montserrat:wght@500;600&display=swap" rel="stylesheet" />
    </Helmet>
    <App />
  </HelmetProvider>
);
