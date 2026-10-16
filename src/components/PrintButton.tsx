"use client";
import { btn } from "./ui";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className={btn.primary}>
      Imprimer / PDF
    </button>
  );
}
