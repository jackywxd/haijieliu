"use client";

import { useEffect, useState } from "react";
import { config } from "@/lib/config";

type MessageItem = {
  from?: string;
  name?: string;
  message: string;
  date?: string;
  created_at?: string;
};

function normalizeMessage(item: MessageItem) {
  return {
    from: item.from ?? item.name ?? "",
    message: item.message,
    date: item.date ?? item.created_at ?? "",
  };
}

export default function Message() {
  const [messages, setMessages] = useState<
    { from: string; message: string; date: string }[] | null
  >(null);

  useEffect(() => {
    if (messages) return;

    fetch(`${config.apiUrl}/message`)
      .then((response) => response.json())
      .then((data: MessageItem[]) => {
        const sorted = data
          .map(normalizeMessage)
          .sort((a, b) => {
            if (a.date > b.date) return -1;
            return 1;
          });
        setMessages(sorted);
      });
  }, [messages]);

  if (!messages?.length) {
    return null;
  }

  return (
    <div id="message">
      <div className="item-1">
        {messages.map((message, i) => (
          <p key={`message-${i}`}>
            {message.message}{" "}
            {message.from && <span>- {message.from}/</span>}
            <span>({new Date(message.date).toLocaleDateString()})</span>
          </p>
        ))}
      </div>
    </div>
  );
}
