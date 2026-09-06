import type { Metadata } from "next";
import Message from "@/components/Message";

export const metadata: Metadata = {
  title: "懷念留言 Messages",
  description:
    "親友為劉海婕（Haijie Liu, 1973–2020）留下的懷念留言。Messages left by family and friends in loving memory of Haijie Liu.",
  alternates: { canonical: "/message" },
};

export default function MessagePage() {
  return <Message />;
}
