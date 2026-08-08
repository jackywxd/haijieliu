"use client";

import { useState } from "react";
import { config } from "@/lib/config";

type Status = "idle" | "sending" | "success" | "error";

export default function EmailForm() {
  const [text, setText] = useState("");
  const [from, setFrom] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!text.trim() || status === "sending") return;

    setStatus("sending");

    try {
      const response = await fetch(`${config.apiUrl}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, message: text }),
      });

      if (!response.ok) throw new Error(await response.text());

      setStatus("success");
      setText("");
      setFrom("");
    } catch {
      setStatus("error");
    } finally {
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const message =
    status === "sending"
      ? "Sending..."
      : status === "success"
        ? "Your message sent...Thank you!"
        : status === "error"
          ? "Something went wrong, please try again."
          : "";

  return (
    <form id="signup-form" onSubmit={onSubmit} method="post" action="#">
      <input
        type="text"
        name="text"
        id="text"
        required
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
      <input type="submit" value="Send" disabled={status === "sending"} />
      <span
        className={`${message ? "visible" : ""} ${
          status === "error" ? "failure" : "success"
        } message`}
      >
        {message}
      </span>
    </form>
  );
}
