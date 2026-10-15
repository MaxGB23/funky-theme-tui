// OpenCode syntax showcase — one construct per syntax* slot.
// Open beside opencode-showcase.md; every token below names its slot.

// syntaxComment: full-line comments render here.
import { helper } from './lib'; // syntaxKeyword: import/from — syntaxString: './lib' — syntaxPunctuation: { } ; ' '

const retries: number = 3; // syntaxKeyword: const — syntaxVariable: retries — syntaxType: number — syntaxOperator: = — syntaxNumber: 3 — syntaxPunctuation: : ;

function greet(name: string): string { // syntaxKeyword: function — syntaxFunction: greet — syntaxVariable: name — syntaxType: string — syntaxPunctuation: ( ) { }
  // syntaxComment: indented comments share the same token.
  const loud: boolean = name.length > 0; // syntaxVariable: loud — syntaxOperator: > — syntaxNumber: 0
  return `hello ${name}!`; // syntaxKeyword: return — syntaxString: template literal — syntaxVariable: name inside ${ }
}

type Item = { id: number; label: string }; // syntaxKeyword: type — syntaxType: Item — syntaxPunctuation: = { } : ;

class Queue { // syntaxKeyword: class — syntaxType: Queue
  private items: Item[] = []; // syntaxKeyword: private — syntaxVariable: items — syntaxType: Item[] — syntaxOperator: = — syntaxPunctuation: [ ] ;
}

const total: number = retries + 8 * 2; // syntaxOperator: + * — syntaxNumber: 8 2
const ok: boolean = total !== 0 && loud; // syntaxOperator: !== && — syntaxNumber: 0

greet('funky'); // syntaxFunction: call — syntaxString: 'funky' — syntaxPunctuation: ( ) ;

export { helper, greet }; // syntaxKeyword: export — syntaxPunctuation: { } ,
