import React from 'react';
import { SouthStationDepartureBoard } from './components/DepartureBoard';
import stationBackground from "./images/southstation.jpeg"


function App() {
  console.log(stationBackground)
  const style = {
    backgroundImage: `url(${stationBackground})`,
    backgroundSize: 'cover',
    display: "flex",
    alignItems: "center",
    justifyContent: "top",
    flexDirection: "column",
    height: '100vh',
    width: '100vw',
  }

  return (
    <div style={style}>
      <SouthStationDepartureBoard/>
    </div>
  );
}

export default App;
