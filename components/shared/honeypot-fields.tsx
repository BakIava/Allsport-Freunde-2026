"use client";

import { useEffect, useState } from "react";

export default function HoneypotFields() {
  const [ts, setTs] = useState("");

  useEffect(() => {
    setTs(Date.now().toString());
  }, []);

  return (
    <>
      <input
        type="text"
        name="_hp"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          height: 0,
          width: 0,
          border: 0,
          padding: 0,
          margin: 0,
          left: "-9999px",
          top: "-9999px",
        }}
      />
      <input
        type="hidden"
        name="_ts"
        value={ts}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        readOnly
      />
    </>
  );
}
