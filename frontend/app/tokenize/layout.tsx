import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tokenize",
};

export default function TokenizeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
