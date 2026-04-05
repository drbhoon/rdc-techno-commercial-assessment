import path from "path";
import fs from "fs";
import type { Question } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");

function loadBank(file: string): Question[] {
  const filePath = path.join(DATA_DIR, file);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Question bank not found: ${filePath}\nRun: py scripts/build-question-banks.py`
    );
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Question[];
}

let _selling: Question[] | null = null;
let _technical: Question[] | null = null;

export function getSellingBank(): Question[] {
  if (!_selling) _selling = loadBank("selling-questions.json");
  return _selling;
}

export function getTechnicalBank(): Question[] {
  if (!_technical) _technical = loadBank("technical-questions.json");
  return _technical;
}

export function getBank(type: "selling" | "technical"): Question[] {
  return type === "selling" ? getSellingBank() : getTechnicalBank();
}
