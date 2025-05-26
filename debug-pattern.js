// Quick debug script to find which pattern is catching "Of course! I'm always here for you"

const testText = "Of course! I'm always here for you.";

const patterns = [
  {name: "Guilt Tripping", pattern: /(shouldn['']t have to tell you that|too busy for me when I need|guess you['']re too busy to|you didn['']t even notice when I|you just don['']t care about me|i guess you just don['']t care|you should already know how|if you really cared you would have|after all I('ve| have) done for you and|can['']t believe you would do this to me|you never appreciate what I|don['']t even care that I)/i},
  {name: "All-or-Nothing", pattern: /(you never listen|you always do this|you don['']t care at all|everything is ruined|nothing ever changes|not once have you helped|every single time you)/i},
  {name: "Emotional Manipulation", pattern: /(if you really loved me|show me you mean it|just empty words|if you loved me|prove it|leave you if|without me you|no one else would|look what you made me do|guilt you|you owe me|after everything i did|you should feel bad)/i},
  {name: "Love Bombing", pattern: /(never loved anyone like|perfect for me|soulmate|destiny|meant to be|never felt this way|changed my life|complete me|no one compares|only you understand)/i}
];

console.log(`Testing: "${testText}"`);
patterns.forEach(p => {
  if (p.pattern.test(testText)) {
    console.log(`❌ MATCHED: ${p.name}`);
  } else {
    console.log(`✅ OK: ${p.name}`);
  }
});