import React, { useState } from 'react';
import './App.css';
import { AppMain } from './components';

function App() {
  // Add unit preference state - moved inside the component
  const [distanceUnit, setDistanceUnit] = useState('km'); // 'km' or 'miles'
  
  return <AppMain distanceUnit={distanceUnit} setDistanceUnit={setDistanceUnit} />;
}

export default App;