import React from "react";
import ReactDOM from "react-dom";

function App() {
  return <h1 onClick="bar">Hello React!</h1>;
}

ReactDOM.render(<App />, document.getElementById("app"));
