import type { Metadata } from "next";
import Message from "@/components/Message";

export const metadata: Metadata = {
  title: "Messages | In Loving Memory Haijie",
  description: "Messages left in loving memory of Haijie.",
};

export default function MessagePage() {
  return <Message />;
}
