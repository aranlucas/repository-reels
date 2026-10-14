import React from "react";
import { createRoot } from "react-dom/client";
import { HyperframesPlayer } from "@hyperframes/player";
import ScreeningRoom from "./screening-room.jsx";
import "./style.css";

if (!customElements.get("hyperframes-player")) {
  customElements.define("hyperframes-player", HyperframesPlayer);
}

createRoot(document.querySelector("#root")).render(<ScreeningRoom />);
