"use client";

import { useState } from "react";
import { config } from "@/lib/config";

export default function EmailForm() {
  const [text, setText] = useState("");
  const [from, setFrom] = useState("");
  const [message, setMessage] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMessage("Your message sent...Thank you!");

    if (text.length > 0) {
      fetch(`${config.apiUrl}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, message: text }),
      });
    }

    setTimeout(() => {
      setMessage("");
      setText("");
      setFrom("");
    }, 3000);
  };

  return (
    <form id="signup-form" onSubmit={onSubmit} method="post" action="#">
      <input
        type="text"
        name="text"
        id="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Send message to Haijie..."
      />
      <input
        type="text"
        name="name"
        id="name"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        placeholder="Name"
      />
      <input type="submit" value="Send" />
      <span className={`${message ? "visible success" : ""} message`}>
        {message}
      </span>
    </form>
  );
}
