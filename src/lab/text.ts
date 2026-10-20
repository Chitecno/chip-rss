/**
 * Herramientas de texto del laboratorio. Nada de IA: contamos palabras.
 * Una palabra pesa más cuanto más rara es en el conjunto (TF-IDF), así "Chubut" importa
 * más que "gobierno" para decidir si dos notas hablan de lo mismo.
 */

export function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const STOPWORDS = new Set(
  normalize(`
    a al algo alguna algunas alguno algunos ante antes asi aun aunque bajo bien cada como con contra cual
    cuales cuando de del desde donde dos durante el ella ellas ellos en entre era eran es esa esas ese eso
    esos esta estan estas este esto estos fue fueron ha han hasta hay hace hacia la las le les lo los mas
    me mi mientras mismo muy nada ni no nos o otra otras otro otros para pero poco por porque que quien
    se sea segun ser si sin sobre solo son su sus tambien tan tanto te tiene tienen todo todos tras tu un
    una uno unos y ya yo
    hoy dia dias ano anos nuevo nueva nuevos nuevas dijo dice parte puede pueden sera seran despues ahora
    gran tres cuatro cinco seis mil millones vez veces cosa cosas tener hacer forma caso casos primer
    primera ultimo ultima ultimos video videos foto fotos minuto vivo
    lunes martes miercoles jueves viernes sabado domingo semana fin
    enero febrero marzo abril mayo junio julio agosto septiembre setiembre octubre noviembre diciembre
    persona personas historia historias pais mundo ciudad casa vivir todas todo top doble frente
    tiempo hora horas clave claves asi conocer sabe saber quiere mejor mejores peor nunca siempre
    the of and to in for on with is are from by at an as be this that it its was were will has have
    how why what you your new not but can just more about after over
  `).split(/\s+/),
);

// Plurales y terminaciones comunes: "sanciones" y "sanción" cuentan como la misma palabra.
function stem(word: string): string {
  if (word.length > 6 && word.endsWith('ciones')) return word.slice(0, -5) + 'on';
  if (word.length > 5 && word.endsWith('iones')) return word.slice(0, -4) + 'on';
  if (word.length > 4 && word.endsWith('s')) return word.slice(0, -1);
  return word;
}

export type Token = { stem: string; form: string };

/** Palabras con peso de un texto, con la forma original para mostrarlas (con tildes). */
export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  for (const raw of text.split(/[^\p{L}\p{N}]+/u)) {
    if (raw.length < 3) continue;
    const lower = raw.toLowerCase();
    const plain = normalize(lower);
    // Afuera las palabras vacías, los números chicos y los años.
    if (STOPWORDS.has(plain) || /^\d{1,3}$/.test(plain) || /^(19|20)\d\d$/.test(plain)) continue;
    out.push({ stem: stem(plain), form: lower });
  }
  return out;
}

export type Vector = Map<string, number>;

export type Corpus = {
  vectors: Map<string, Vector>;
  /** stem → la forma más frecuente, para mostrar "sanciones" y no "sancion". */
  forms: Map<string, string>;
};

/** Arma un vector por nota. El título pesa el doble que el resumen. */
export function buildCorpus(docs: { id: string; title: string; summary: string }[]): Corpus {
  const counts = new Map<string, Map<string, number>>();
  const df = new Map<string, number>();
  const formCounts = new Map<string, Map<string, number>>();

  for (const doc of docs) {
    const tf = new Map<string, number>();
    const add = (tokens: Token[], weight: number) => {
      for (const t of tokens) {
        tf.set(t.stem, (tf.get(t.stem) ?? 0) + weight);
        const forms = formCounts.get(t.stem) ?? new Map<string, number>();
        forms.set(t.form, (forms.get(t.form) ?? 0) + 1);
        formCounts.set(t.stem, forms);
      }
    };
    add(tokenize(doc.title), 2);
    add(tokenize(doc.summary), 1);
    counts.set(doc.id, tf);
    for (const term of tf.keys()) df.set(term, (df.get(term) ?? 0) + 1);
  }

  const n = docs.length;
  const vectors = new Map<string, Vector>();
  for (const [id, tf] of counts) {
    const v: Vector = new Map();
    let norm = 0;
    for (const [term, f] of tf) {
      const w = f * Math.log((n + 1) / ((df.get(term) ?? 0) + 0.5));
      if (w <= 0) continue;
      v.set(term, w);
      norm += w * w;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [term, w] of v) v.set(term, w / norm);
    vectors.set(id, v);
  }

  const forms = new Map<string, string>();
  for (const [s, fc] of formCounts) {
    forms.set(s, [...fc.entries()].sort((a, b) => b[1] - a[1])[0][0]);
  }
  return { vectors, forms };
}

/** Parecido entre dos notas: 0 nada en común, 1 iguales. */
export function cosine(a: Vector, b: Vector): number {
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [term, w] of small) {
    const other = big.get(term);
    if (other) dot += w * other;
  }
  return dot;
}
