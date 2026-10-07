import { quizzes } from "../src/content.js";

const errors = [];

for (const quiz of quizzes) {
  if (quiz.questions.length !== 6) {
    errors.push(`${quiz.slug}: expected 6 questions, found ${quiz.questions.length}`);
  }

  const seenOptions = new Set();
  const seenClaims = new Set();
  const answerCounts = [0, 0, 0, 0];
  const seenPrompts = new Set();

  for (const question of quiz.questions) {
    if (!question.prompt?.trim()) errors.push(`${question.id}: missing question prompt`);
    if (seenPrompts.has(question.prompt)) errors.push(`${question.id}: repeated prompt in quiz`);
    seenPrompts.add(question.prompt);

    if (question.options.length !== 4) {
      errors.push(`${question.id}: expected 4 options, found ${question.options.length}`);
      continue;
    }

    const correct = question.options.filter((option) => option.correct);
    if (correct.length !== 1) errors.push(`${question.id}: expected exactly one correct answer, found ${correct.length}`);

    const answerPosition = question.options.findIndex((option) => option.correct);
    if (answerPosition >= 0) answerCounts[answerPosition] += 1;

    const lengths = question.options.map((option) => option.text.trim().split(/\s+/).length);
    const lengthSpread = Math.max(...lengths) - Math.min(...lengths);
    if (lengthSpread > 12) errors.push(`${question.id}: option length spread of ${lengthSpread} words may reveal the key`);

    for (const option of question.options) {
      const normalized = option.text.trim().toLocaleLowerCase();
      if (!normalized) errors.push(`${question.id}: blank answer option`);
      if (seenOptions.has(normalized)) errors.push(`${question.id}: repeated option within this quiz`);
      seenOptions.add(normalized);
      const claim = normalized
        .replace(/^(the essay’s argument is|the conclusion is|the examples show|a necessary assumption is|a new case):\s*/u, "")
        .replace(/[.!?]+$/u, "")
        .trim();
      if (seenClaims.has(claim)) errors.push(`${question.id}: repeated answer claim across questions (only the lead-in differs)`);
      seenClaims.add(claim);
      if (!option.correct && (!option.trap || !option.note)) errors.push(`${question.id}: distractor is missing its trap explanation`);
    }
  }

  if (answerCounts.some((count) => count < 1 || count > 2)) {
    errors.push(`${quiz.slug}: correct-answer positions are unbalanced (${answerCounts.join(", ")})`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated ${quizzes.length} quizzes: six questions and 24 distinct answer claims each, balanced answer keys, and plausible option lengths.`);
}
