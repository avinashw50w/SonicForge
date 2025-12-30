
# SonicForge - Professional Audio Suite

SonicForge is a modern web-based audio processing application that leverages advanced DSP, FFmpeg, and AI (Gemini) to provide professional-grade audio tools in the browser.

## Features

### 1. Loop Genius
*   **AI-Powered Analysis**: Automatically finds the best seamless loops in any song using Google Gemini and DSP algorithms.
*   **Loop Categories**: Categorizes loops into "Best", "Shortest", "Longest", "Earliest", and "Latest".
*   **Song Builder**: Automatically constructs a repeated loop song from your selected loop.
*   **MP3 Export**: Convert your generated loops to high-quality MP3s.

### 2. Audio Editor
*   **Real-time Preview**: Hear effects instantly using the Web Audio API and Tone.js.
*   **Pro Tools**:
    *   **Trimming**: Precision waveform trimming.
    *   **Time & Pitch**: Change speed and pitch independently.
    *   **3-Band EQ**: Sculpt your sound with Low, Mid, and High controls.
    *   **Effects Rack**: Reverse Audio, 8D Spatial Audio (Auto-pan), Stadium Reverb, and AI Enhancer.
    *   **AI Enhancer**: Automatically normalizes and compresses audio for professional loudness and clarity.
*   **Presets**: One-click presets like "Nightcore", "Slowed + Reverb", "Bass Boost", and "8D".

### 3. Studio Mixer
*   **Multi-track Support**: Upload multiple audio files.
*   **Join Mode**: Sequence tracks one after another.
*   **Mix Mode**: Overlay tracks to play simultaneously.

### 4. Video Extractor
*   **Instant Extraction**: Convert MP4, MOV, or AVI video files to high-quality MP3 audio.

## Architecture

*   **Frontend**: React, TypeScript, Vite, Tailwind CSS.
*   **Audio Engine**: Web Audio API + Tone.js for real-time preview and synthesis.
*   **Backend**: Node.js, Express.
*   **Processing**: `fluent-ffmpeg` for high-performance audio rendering and conversion.
*   **AI**: Google Gemini API for semantic audio analysis.

## Getting Started

### Prerequisites
*   Node.js (v18+)
*   FFmpeg installed on your system and available in PATH.

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the root directory and add your Google Gemini API key:
    ```env
    API_KEY=your_gemini_api_key
    ```

### Running the App

Start both the frontend (Vite) and backend (Express) concurrently:

```bash
npm run dev
```

*   Frontend: `http://localhost:5173`
*   Backend: `http://localhost:3001`

## Usage

1.  **Upload**: Drag and drop or select an audio file.
2.  **Edit**: Use the visual tools to tweak parameters.
3.  **Process**: Click "Render" to generate the high-quality output on the server.
4.  **Download**: Save the result to your device.

## License

MIT
