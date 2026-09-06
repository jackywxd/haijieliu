import messages from "@/content/messages.json";

export default function Message() {
  return (
    <div id="message">
      <h1 className="sr-only">
        懷念留言 — Messages in Loving Memory of Haijie Liu
      </h1>
      <div className="item-1">
        {messages.map((message, i) => (
          <p key={`message-${i}`}>
            {message.message}{" "}
            {message.from && <span>- {message.from}/</span>}
            <span>({new Date(message.date).toLocaleDateString("en-US")})</span>
          </p>
        ))}
      </div>
    </div>
  );
}
