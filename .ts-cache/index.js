import React from "react";
import ReactDOM from "react-dom";
function App() {
    return React.createElement("h1", null, "Hello React!");
}
ReactDOM.render(React.createElement(App, null), document.getElementById("app"));
