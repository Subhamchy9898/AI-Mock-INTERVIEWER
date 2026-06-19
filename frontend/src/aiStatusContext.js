import React, { createContext, useState } from "react";

export const AIStatusContext = createContext();

export function AIStatusProvider({ children }) {
  const [aiStatus, setAiStatus] = useState("idle"); // idle | checking | available | unavailable

  // Return without JSX so the file can remain .js and not require JSX transformation
  return React.createElement(
    AIStatusContext.Provider,
    { value: { aiStatus, setAiStatus } },
    children
  );
}

export default AIStatusProvider;
