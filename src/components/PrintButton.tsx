"use client";
import { Printer } from "lucide-react";
import { button } from "./ui";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className={button("secondary")}>
      <Printer size={17} aria-hidden />
      Imprimer
    </button>
  );
}
