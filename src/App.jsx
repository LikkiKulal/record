// src/App.js
import React from 'react';
import './App.css';
import ScreenRecorder from './pages/ScreenRecorder';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Screen Recorder App</h1>
        <ScreenRecorder />
      </header>
    </div>
  );
}

export default App;
