import React from 'react';
import { SouthStationDepartureBoard } from './components/DepartureBoard';
import { stationBackground } from "./images/southstation.jpeg"


function App() {
  const style = {
    // backgroundImage: `url(${stationBackground})`,
    display: "flex",
    alignItems: "center",
    justifyContent: "top",
    background: "gray",
    flexDirection: "column",
    height: '100vh',
  }

  return (
    <div style={style}>
      <SouthStationDepartureBoard/>
    </div>
  );
}

export default App;
