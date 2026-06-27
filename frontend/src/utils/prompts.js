export const DATE_NIGHT_PROMPTS = [
  { id: 'p1', category: 'Memory', text: 'What is your favourite memory of us this year?' },
  { id: 'p2', category: 'Dreams', text: 'If we could teleport anywhere tomorrow, where would we go?' },
  { id: 'p3', category: 'Us', text: 'What is one small thing I do that makes you feel loved?' },
  { id: 'p4', category: 'Future', text: 'What tradition do you want us to start as a couple?' },
  { id: 'p5', category: 'Gratitude', text: 'What are you most grateful for about our relationship right now?' },
  { id: 'p6', category: 'Play', text: 'What adventure have we never tried but should?' },
  { id: 'p7', category: 'Deep', text: 'When did you know you wanted to build a life with me?' },
  { id: 'p8', category: 'Fun', text: 'What song feels most like us as a couple?' },
  { id: 'p9', category: 'Home', text: 'What does our ideal ordinary Sunday look like?' },
  { id: 'p10', category: 'Growth', text: 'How can we support each other better this month?' },
  { id: 'p11', category: 'Memory', text: 'Which trip together changed us the most?' },
  { id: 'p12', category: 'Forever', text: 'What promise do you want to make to our future selves?' },
];

export function randomPrompt() {
  return DATE_NIGHT_PROMPTS[Math.floor(Math.random() * DATE_NIGHT_PROMPTS.length)];
}
