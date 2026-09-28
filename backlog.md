# Backlog — funky-theme-tui

> **Reescrito 2026-09-25.** Este documento ya no describe una "evolución multiplataforma" sino un
> **proyecto propio y separado**: `funky-theme-tui`. Reemplaza al plan de monorepo que se
> descartó, y al backlog v1/v2 fusionado que lo precedió.
>
> Todos los datos de *Estado verificado* y *Contrato de formato* fueron confirmados por
> inspección de disco. Donde algo no está verificado, dice explícitamente **no verificado**.

---

## 1. Objetivo

Un tema para **coding agents en terminal** — OpenCode, Pi, Claude Code — que mantenga la
**esencia** de Funky Theme sin ser una copia.

La premisa es explícitamente **no** "la misma paleta, distintos renderers". Es:

> **Misma intención de diseño, paleta afinada de forma independiente.**

Las terminales son otro mundo: la luz es otra, el usuario es otro, y el contenido que se lee
es otro. La paleta puede ser *muy similar*, no *idéntica*. Lo que se preserva es la esencia que
el autor considera necesaria — y es una decisión de gusto personal, no una restricción técnica.

**No hay source of truth compartida con el repo de VS Code.** Ver §4.

---

## 2. Identidad y naming

### Cuatro capas de nombre

El proyecto de VS Code ya usa un modelo de tres capas. Este lo replica con la diferencia de que
**no lleva easter egg**.

| Capa | `funky-theme` (VS Code) | `funky-theme-tui` (nuevo) |
|---|---|---|
| Marca | Funky Theme | **Funky Theme for TUIs** |
| Repo | `funky-theme` | **`funky-theme-tui`** |
| Label público | Funky Dark, Funky Darker, … | **Funky TUI Dark**, **Funky TUI Darker** |
| `name` en el JSON del theme | `Maxiano Dark`, `Maxiano Darker`, … | **`Funky TUI Dark`**, **`Funky TUI Darker`** |

**Ningún nombre de variante contiene la palabra "Theme"** — ni `Funky Dark` ni `Maxiano Dark`. Por
eso los labels de terminal son `Funky TUI <Variante>` y no `Funky TUI Theme <Variante>`. Eso
además los mantiene cortos y tipeables en `"theme": "..."`.

### El easter egg `maxiano` no se replica — y es intencional

> `maxiano` se queda **solo en VS Code**, a manera de conmemoración: fue el inicio de todo este
> trabajo. Los archivos (`maxiano-*.json`) **y** el campo `name` de cada theme lo llevan. El
> marketplace nunca lo ve — el label público dice "Funky".

`funky-theme-tui` **no** lleva easter egg. El `name` en el JSON es el nombre real del producto.

> **A confirmar:** el `name` de cada variante será `Funky TUI Dark` / `Funky TUI Darker` — marca
> `Funky TUI` + sufijo de variante, siguiendo el patrón de VS Code (`Maxiano Dark` = marca
> `Maxiano` + `Dark`). Si el nombre fuera solo `Funky TUI` sin sufijo, las dos variantes serían
> indistinguibles en el selector de cualquier runtime.

### Por qué `funky-theme-tui` y no `funky-tui`

La familia de nombres es `funky-theme` → `funky-theme-vscode` → **`funky-theme-tui`**.
Previsibilidad: quien conoce el ID de marketplace `MaxGB23.funky-theme-vscode` predice este
nombre sin pensarlo.

- `theme` desambigua: un nombre terminado en `tui` se lee como **aplicación** TUI, que es la
  norma del ecosistema (`lazygit`, `btop`, `ghostty`, `tui-rs`, `awesome-tui`).
- `tui` nombra el target: agrupa OpenCode, Pi y Claude Code bajo una implementación.
- Singular `theme`: una identidad visual con varios targets y variantes, no una colección.
- Escalable: sumar Codex u otra TUI no invalida el nombre.

**Disponibilidad verificada:** `funky-theme-tui` devuelve 404 en el registro de npm y no figura
entre los repos públicos de `MaxGB23`. También libres: `funky-tui`, `funky-tui-theme`.

### License

**MIT**, igual que `funky-theme`.

### Topics de GitHub: se quedan en `funky-theme`

`funky-theme` **conserva** sus topics actuales, que ya incluyen `opencode`, `pi`, `terminal` y
`terminal-theme` además de los de VS Code. Motivo: su README tiene una sección dedicada que va a
enlazar el repo de TUIs, y eso da **más alcance** al proyecto nuevo desde un repo que ya tiene
4 estrellas y posicionado. No se mueven ni se duplican.

---

## 3. Variantes

**Dos variantes, y son gemelas.**

| Variante | Nombre | Fondo |
|---|---|---|
| Principal | **Funky TUI Dark** | `#06080f` (el de `gentleman-cute`) |
| Nocturna | **Funky TUI Darker** | **más oscuro** |

**Gemelas** significa: idéntico diseño en todo, y la **única diferencia es la capa de fondo**. No
son dos lecturas distintas del código — es el mismo diseño con el fondo bajado.

> **No habrá `Funky TUI Italic`.** Ni variantes raras, ni `high-contrast`, ni `dark-mix`, ni
> `light`. Dos, y solo dos.

### La tipografía no es una restricción imposed

Esto estaba mal redactado antes y hay que corregirlo: **no se trata de "evitar el uso de
italics"**.

La base es **`gentleman-cute`**, que ya usa **mínimos italics y pocas italics** por diseño
propio. Eso viene heredado de la base, no como regla que imposed. La diferencia con VS Code es
que allá existen 5 perfiles tipográficos y acá hay **uno solo**, tomado tal cual de la base.

En VS Code, `tokenColors` tiene 8 reglas con `fontStyle` (4 `bold`, 4 `italic`), todas de
markdown. En terminal se hereda lo que tenga `gentleman-cute` y no se le agregan variantes.

---

## 4. Dirección de la paleta

> **Resuelto (2026-09-25):** la base/template es **`gentleman-cute`**, el theme más mantenido.

`gentle-shell` está basado en Pi y es el runtime en uso. `gentle-pi@3.3.0` publica
`Gentleman-Cute.json` upstream, así que cada update puede tocar el mismo theme del que partimos.
Eso convierte el drift de Pi en **materia prima de diseño**, no solo en detección: el
`check-upstream.mjs` ya lo rastrea.

### El overlay literal con Funky Theme es casi cero

| | Funky (VS Code) | `gentleman-cute` |
|---|---|---|
| Fondo | `#24212e` violeta oscuro | `#06080f` casi-negro |
| Acento | `#8c8eff` periwinkle | `#7FB4CA` azul acero |
| Error | `#ff8282` coral | `#CB7C94` rosa empolvado |
| Cursor | `#ffde25` | *(sin token)* |

Maxiano es neón de alta croma; Gentleman es desaturado y frío. **Son dos linajes distintos.**

**Esto es lo que mata el monorepo**, y por eso §8. No hay artefacto compartido que hacer
atómico: la paleta de terminal nunca fue la paleta de VS Code.

### Cómo se adapta una copia de `gentleman-cute`

> **Aplazada explícitamente a otra sesión (2026-09-25).** No bloquea este documento ni el
> andamiaje. El mecanismo de verificación ya existe: `check-upstream.mjs`.

Estrategia de distribución: **copiar, no symlinkear.** Los artefactos son output generado y en
Windows el symlink a archivo requiere admin o Developer Mode.

---

## 5. Release y distribución

> **Proceso manual por diseño. Las credenciales no se comparten deliberadamente.**

Esto no es una limitación pendiente de resolver. Es una decisión, y el proceso de release es
una **skill revisada**, no CI.

| | |
|---|---|
| Pipeline de release | **La skill.** Manual, revisado, paso a paso. |
| CI | **Validación secundaria mínima.** El release ya se verificó en el proceso manual. |
| Publicación en marketplace | **Trabajo humano.** El agente hace handoff, nunca sube. |
| `vsce publish` | **Prohibido** — bumpea solo y crea commit+tag |
| Release notes | Siempre en **inglés**, aunque la conversación sea en otro idioma |
| Automatización de release | **No se propone.** Fuera de alcance por decisión. |

### Versionado: `0.x.x`, stream propio

**No comparte línea con Funky Theme.** No sale como `v3.x.x`, y no debería.

Con repo separado y paleta independiente, acoplar los números sería mentir: un theme de
terminal publicado como `3.2.0` afirmaría que sigue a Funky `3.2.0`, y sería falso.

`0.x.x` porque **aún no está definido todo como para ser v1**. Es la señal correcta de
"superficie de API y convenciones todavía en movimiento". El primer release es `0.1.0`.

Contraste con el caso de Funky Theme: durante su primer año se definieron muchas cosas **sin
versionar, por falta de conocimiento de git**. Hoy se arranca con el versionado correcto desde
el día uno.

### Selectividad de release

**No hace falta automatización para eso.** La regla es disciplina, no tooling:

- Enumerar `git log <último-tag>..HEAD` **antes** de decidir el bump y redactar las notas.
- Si el rango no amerita un bump, no hay release.
- Los cambios reales de una paleta son clase **PATCH** — mini fixes, alphas. Eso *es* la fila
  PATCH de la tabla de bump, no una excepción.

### distribución por target

| Target | Canal | Release |
|---|---|---|
| Pi | El theme viaja **dentro del paquete npm** `gentle-pi` (`"files": ["themes/"]`) | Tag + release cuando se publica el paquete |
| OpenCode | Copia al config del usuario | Tag; el artefacto viaja en el repo |
| Claude Code | Copia a `~/.claude/themes/` | Tag; idem |

"¿Tiene marketplace?" es una **propiedad del target**, no una decisión por release. Pi tiene
canal de distribución real; los otros dos se instalan por copia.

### Cada repo tiene su propia release skill y su propio `AGENTS.md`

No se comparte un proceso de release entre `funky-theme` y `funky-theme-tui`. **Cada repo se
gobierna con sus propias reglas**, porque las dos piezas tienen destinatarios y riesgos distintos:

| | `funky-theme` | `funky-theme-tui` |
|---|---|---|
| Release skill | Ya existe y está versionada (v1.9) | **A crear**, derivada de ese patrón |
| Modelo de versión | `3.x.x` con rc/beta/alpha | `0.x.x`, sin prereleases |
| Paso de VSIX | Sí, con `verify:vsix` | **No aplica** |
| `AGENTS.md` | Propio | Propio, con reglas propias |
| Riesgo | Marketplace con usuarios activos | 0 usuarios todavía |

**El contenido de esas reglas se discute después.** Hoy es un backlog genérico: lo que queda
registrado es que **cada repo tiene las suyas**, no cuáles son.

### Reglas de propagación entre repos — pendiente de discutir

Hay un caso que los dos repos van a tener que resolver y que **no** está resuelto:

> Si un cambio en la paleta de TUIs toca un **color clave**, ¿se propaga al repo de VS Code?

La respuesta probablemente sea **no por defecto**, y el motivo es concreto: `funky-theme` tiene
usuarios activos en el marketplace y **no todos ellos piden ese cambio**. El repo de TUIs, con
`0.1.0` y cero instalaciones, puede moverse rápido. El de VS Code no puede, sin que eso se
convierta en un ISSUE molesto para su audiencia.

Es decir: la asimetría de velocidad entre los dos repos es real y hay que reconocerla antes de
que una release de TUIs obligue a decidir sobre la marcha.

> **Abierto, para discutir en otra sesión.** No se resuelve hoy.

### Secuencia de arranque

1. Commit inicial en `funky-theme-tui`.
2. Recién ahí se toca el README de `funky-theme`.
3. El anuncio de la versión para TUIs entra por **`CHANGELOG.md` de `funky-theme`, sección
   `[Unreleased]`** — no por el README.

> **El README de `funky-theme` no se toca hasta que exista el primer commit en
> `funky-theme-tui`.** Hoy su sección `### Terminal-based AI Agents (WIP)` dice *"still debating
> packaging and whether it ships in this repo or a separate one"*. Esa frase está vencida pero
> **se deja así a propósito** hasta que haya algo que enlazar. Es deuda consciente, no olvido.

---

## 6. Estado verificado (2026-09-25)

### Targets y variantes en disco

| Target | Variantes en disco | En alcance | Notas |
|---|---|---|---|
| OpenCode | 2 | 2 | `gentleman.json`, `gentleman-cute.json` |
| Claude Code | 2 | 2 | `claude-code/gentleman.json`, `claude-code/gentleman-cute.json` |
| Pi | 2 | 2 | `pi/Gentleman.json`, `pi/Gentleman-Cute.json` |

- Las variantes en disco usan el prefijo **`gentleman-*`**, no el nombre final. Se renombran a
  `Funky TUI Dark` / `Funky TUI Darker` al emitir.
- VS Code **no es un target** de este proyecto. Se documenta solo como referencia (§9).

### Automatización existente

| Pieza | Estado | Funciona |
|---|---|---|
| `claude-code/*.json` generados desde la raíz por `cc-map.mjs` | **Sí** | 72/72 slots desde los 50 tokens de OpenCode |
| `check-upstream.mjs` + `sources.json` + `SOURCES.md` | **Sí** | 24 checks, drift + upstream + build inputs, read-only |
| Generador para OpenCode | **No** | — |
| Generador para Pi | **No** | — |
| `package.json` en el repo | **No existe** | No hay contrato de variantes declarado |
| Release skill | **Pendiente** | Se deriva del patrón de `funky-theme` |
| CI de release | **No, y no se quiere** | Decisión, no gap. Ver §5 |

### Upstream

Solo **Pi** tiene upstream real: `gentle-pi@3.3.0` (npm), repo
`github.com/Gentleman-Programming/gentle-shell`. Claude Code y OpenCode **no tienen upstream** —
esos temas son trabajo nuestro. Ver `SOURCES.md`.

---

## 7. Contrato de formato por plataforma

Cada target tiene una forma distinta. Un archivo correcto para uno es **silenciosamente
incorrecto** para otro. Este es el detalle que más probablemente rompa la generación.

| Target | Forma | Sintaxis | Slots | Alpha | Fallo silencioso |
|---|---|---|---|---|---|
| **OpenCode** | `$schema` + `theme{}` plano | `#RRGGBB` | ~50 | No | Theme por defecto |
| **Claude Code** | `name` + `base` + `overrides{}` | `rgb(r,g,b)` | 72 (hereda de `base`) | No | **Total: `overrides: undefined` → dark por defecto, cero warnings** |
| **Pi** | `vars{}` hex + `colors{}` con **indirecciones** + `export{}` | `#RRGGBB` | 19-36 vars / 51-56 colors | No | Sin feedback de validación |

Consecuencias para el generador:

1. **Alpha.** Los tres targets **no soportan alpha**. Referencia: en VS Code `#RRGGBBAA` aparece
   en 57 de 315 strings, con hasta 12 pasos sobre un mismo acento. Acá hay que componer contra
   el fondo o descartar el canal — **aplazado a la sesión de adaptación de `gentleman-cute`**
   (§11 #12), no se decide acá.
2. **Indirección de Pi.** `colors.accent = "accent"` es una *referencia* a una var, no un color.
   Ningún otro target tiene esta capa.
3. **Herencia de Claude Code.** `base` + `overrides` permite emitir solo los slots que difieren
   del dark. Es la única plataforma con herencia nativa.
4. **Esquemas que derivan.** El loader de Claude Code **descarta slots desconocidos sin
   warning**. Un token nuevo en 2.1.280 rompe el theme en silencio.

### Referencia: el linaje de VS Code, y por qué queda afuera

Documentado por si hay que consultarlo, **no** como target:

| Pieza | Ruta | Bytes |
|---|---|---|
| Source de verdad | `src/theme-config.js` | **53.842** |
| Generador | `scripts/build.js` | **16.424** |
| Validador | `scripts/validate-themes.js` | 1.204 |
| Verificador de VSIX | `scripts/verify-vsix.js` | 5.837 |
| CI | `.github/workflows/ci-build.yml` | 552 |
| Historial | 30 `.vsix` en la raíz, 1.0.0 → 3.1.1 | — |

> **La copia en `~/.vscode/extensions/maxiano-theme/` está obsoleta** — `theme-config.js` de
> 23.880 B y `build.js` de 3.367 B, una cuarta parte del tamaño real. Ignorarla.

---

## 8. RESUELTO — repos separados, no monorepo

> **Decisión (2026-09-25): repos separados.** Se descartó el monorepo.

El plan anterior-era monorepo sobre `funky-theme` con los targets de agents como paquetes del
workspace. Se cayó por tres razones, en orden de peso:

1. **No hay artefacto compartido que hacer atómico.** La única ventaja del monorepo era
   propagación atómica de la paleta. Pero la paleta de terminal **nunca fue** la de VS Code:
   parte de `gentleman-cute`, un linaje distinto con overlay literal casi cero (§4). No hay
   nada que hacer atómico.
2. **Los cambios son clase PATCH.** Mini fixes y alphas — la fila PATCH de la tabla de bump, no
   una excepción. Se pagarían costos de acoplamiento permanentes para resolver un problema que
   dispara pocas veces al año.
3. **No hay credenciales compartidas.** El release es manual por diseño (§5). Un workspace con
   releases coordinados es exactamente la ceremonia que se decidió no tener.

**Estructura:**

```
funky-theme/          repo de VS Code — existe, MIT, 4 estrellas, 35 tags
funky-theme-tui/      repo de TUIs — nuevo, MIT, empieza en 0.1.0
```

**Qué se commitea y qué no.** El andamiaje se commitea **parcial y deliberadamente**:

| Se commitea | No se commitea | Por qué |
|---|---|---|
| Scripts de generación (`cc-map.mjs`, futuros adaptadores) | Templates, `gentleman-cute.json` y cualquier otro **archivo original** | **No son nuestros.** Son de `gentle-pi` y viven en su paquete npm. Commitearlos los convertiría en distribución no autorizada de material ajeno. |
| `check-upstream.mjs` | Artefactos generados (`claude-code/*.json`, `pi/*.json`) | Son output de un script. Se regeneran; versionarlos duplica la fuente de verdad |
| `SOURCES.md`, `sources.json` — **con paths genéricos** | Nada de rutas absolutas de una máquina | Es por máquina. Un repo público no puede llevar rutas absolutas de una sola máquina |

> Los scripts se commitean **para reutilización personal**. No es un proyecto que se comparta
> como librería — es andamiaje propio que se quiere volver a usar.

**Sanear para versionarlo — HECHO.** `SOURCES.md`, `sources.json` y este `backlog.md`
referenciaban la home de Windows de forma absoluta. Se normalizaron todas a `~/...`, que ya
era la convención mayoritaria dentro del propio `SOURCES.md` (14 usos contra 15 rutas
absolutas), así que el sanitize también cerró una inconsistencia que ya existía en el doc.
Además se eliminó el campo `windowsHome` de `sources.json`: era **dato muerto** — nadie lo
leía, porque `check-upstream.mjs` ya deriva el home de `node:os` y expande `~/` por su cuenta.

La normalización se aplicó sobre los 6 commits con `git filter-branch --tree-filter`, no
solo sobre el working tree, para que la identidad de máquina no quedara en ningún objeto
alcanzable.

**Sobre el email del autor: deliberadamente NO se reescribió.** El campo `user.email` global
de git apunta a un Gmail real, y los 187 commits del repo público `funky-theme` ya lo llevan.
Reescribir 6 commits para ocultarlo no protege nada que no esté ya expuesto, y dejaría este
repo inconsistente con los otros 187. Lo que **sí** era fuga nueva y única de este repo era
el username de Windows y las rutas absolutas, y eso sí se eliminó — verificado: el repo
público `funky-theme` tiene 0 archivos con rutas de usuario.

---

## 9. Fuera de alcance

- **VS Code como target.** Este proyecto no genera themes de VS Code. Se consume su repo como
  referencia, nada más.
- Cualquier variante que no sea `Funky TUI Dark` y `Funky TUI Darker`. En particular **no**
  `Funky TUI Italic`, ni `high-contrast`, ni `dark-mix`, ni `light`.
- **Automatización de release.** Decisión, no gap.
- **CI de release.** La CI es validación secundaria, no pipeline.
- **Sync automático de la paleta con Funky Theme.** No hay fuente compartida (§4).
- `light` en cualquier target.

---

## 10. Bugs y gaps encontrados

| Hallazgo | Impacto |
|---|---|
| `~/.claude/settings.json` pide `"theme": "gentleman"` pero `~/.claude/themes/` no existe | Referencia colgada. Los themes de Claude Code fueron corregidos pero **nunca instalados**. |
| Variantes en disco con prefijo `gentleman-*` | Nomenclatura provisional. Renombrar al emitir. |
| Sin `package.json` en el repo | No hay contrato de variantes declarado. |
| `editorBracketHighlight.foreground4/5/6` = `#00000000` (en VS Code) | Alpha `00` = totalmente transparente. Los pares 4-6 no se resaltan. No documentado. Referencia. |
| Schemas derivan entre versiones | Un token nuevo rompe el theme en silencio. Requiere validación contra el runtime instalado. |

### `editor.foreground` — decisión, no bug

> **Corrección 2026-09-25.** Esto estaba marcado como bug upstream. **No lo es.**

El IDE resuelve `editor.foreground` automáticamente: tiene un default por tipo de tema (dark,
high contrast, light) y no hace falta definirlo. Verificado como **ausente también** en el repo
real de VS Code, o sea que es consistente por diseño, no un descuido.

En una terminal siempre estamos en dark, así que ahí sí se fija — con **`#f8f8f2`** en lugar de
blanco puro, para fatigar menos la vista.

| Target | `editor.foreground` |
|---|---|
| VS Code (referencia) | **No definir.** Lo resuelve el IDE. |
| **OpenCode, Claude Code, Pi** | **`#f8f8f2`** |

> Cada terminal tiene su propio nombre de slot para el texto base. La equivalencia exacta depende
> de qué slot corresponda en cada schema (§7).

---

## 11. Decisiones — estado

| # | Decisión | Estado |
|---|---|---|
| 1 | Monorepo vs. repos separados | **Resuelta: repos separados.** Ver §8. |
| 2 | Nombre del proyecto | **Resuelta: `funky-theme-tui`**, producto "Funky Theme for TUIs". Ver §2. |
| 3 | `name` en el JSON | **Resuelta: `Funky TUI Dark` / `Funky TUI Darker`.** Sin easter egg. Ver §2. |
| 4 | Versión inicial y stream | **Resuelta: `0.1.0`, stream `0.x.x` independiente.** Ver §5. |
| 5 | Variantes | **Resuelta: 2 gemelas, Dark y Darker, solo difieren en el fondo.** Ver §3. |
| 6 | Base de la paleta | **Resuelta: `gentleman-cute`.** Ver §4. |
| 7 | `editor.foreground` | **Resuelta: `#f8f8f2` en terminales, no definir en VS Code.** Ver §10. |
| 8 | License | **Resuelta: MIT.** |
| 9 | Topics de GitHub | **Resuelta: se quedan en `funky-theme`.** Ver §2. |
| 10 | Automatización de release | **Resuelta: no. Manual por diseño.** Ver §5. |
| 11 | Orden de arranque | **Resuelta: commit inicial primero, README de `funky-theme` después.** Ver §5. |
| 12 | **Estrategia de alpha** para los 3 targets | **Aplazada** a la sesión de adaptación de `gentleman-cute`. Ninguno soporta alpha. Ver §7. |
| 13 | **Cómo adaptar la copia de `gentleman-cute`** | **Aplazada explícitamente** a otra sesión. No bloquea este documento. Ver §4. |
| 14 | **Qué se commitea del andamiaje** | **Resuelta.** Scripts sí (reutilización personal). Templates y archivos originales **no** — no son nuestros. Hay que sanear los paths absolutos. Ver §8. |
| 15 | **Release skill de `funky-theme-tui`** | **Abierta.** Se deriva del patrón de `funky-theme`, adaptada a `0.x.x` y sin paso de VSIX. Ver §5. |
| 16 | **`AGENTS.md` de cada repo** | **Abierta.** Cada repo tiene las suyas. El contenido se discute después. Ver §5. |
| 17 | **Reglas de propagación entre repos** | **Abierta.** Si un cambio de color clave en TUIs debe tocar `funky-theme`, que tiene usuarios activos. Asimetría de velocidad real. Ver §5. |
| 18 | **Migrar el pipeline de JS a TS** | **Aplazada a propósito**, no descartada. Ver §13. |

---

## 13. Migración a TypeScript — aplazada, no descartada

El pipeline son 4 ficheros JS, 3.842 líneas, cero dependencias y cero build step:

| Fichero | Líneas | Riesgo de tipos |
|---|---|---|
| `prototypes/color-math.mjs` | 65 | **real** — longitud de hex, 0-255 vs 0-1, `NaN` |
| `prototypes/build-prototypes.mjs` | 1.030 | bajo — recorre datos, no invariantes |
| `check-upstream.mjs` | 494 | bajo — strings y hashes |
| `prototypes/validate-prototypes.mjs` | 2.253 | bajo — 39 checks sobre JSON ya tipado por forma |

**Por qué se aplazó y no se descartó:**

1. **La fase actual es editar el JSON a mano.** Cero código. Migrar ahora es churn puro
   justo antes de que la paleta se mueva, y la paleta se va a mover: migraríamos dos veces.
2. **El módulo que los tipos protegerían de verdad son 65 líneas** — el 1,7% del código. El
   otro 98% es validación y data-walking, que es donde los tipos ganan menos.
3. **La clase de bug que realmente mordió no era de tipos**: un campo muerto
   (`windowsHome`), un `sed` que no ejecutaba, quoting de PowerShell. Los 67 checks
   automatizados cubren mejor esa clase que el compilador.
4. **Un repo "full TS" no es alcanzable igual.** `theme-config.js` y `build.js` se transcriben
   por número de línea desde `funky-theme` y tienen que seguir siendo JS. Siempre habrá una
   frontera JS; la migración solo reduce el tamaño del lado tipado, no lo elimina.

**Lo que reduce el coste cuando se retome:** Node v24.16.0 ejecuta `.ts` de forma nativa.
No hay bundler, ni `node_modules`, ni paso de compilación — solo `tsc --noEmit` para chequear.
Por eso es un pendiente con fecha y no un "no".

**Condición para revisarla:** cuando el pulido de la paleta esté cerrado y
`build-prototypes.mjs` lleve un par de semanas sin cambiar.

**Por dónde empezar si se retoma:** `color-math.mjs`, no el pipeline. Son 65 líneas
autónomas y es el único módulo con invariantes reales; migrar los 3.777 restantes aporta
muy poco. Una migración total en un solo commit, no incremental.

---

## 12. Lo que ya funciona

El generador Claude Code es un **proof of concept andado** de la arquitectura:

```
gentleman.json (50 tokens hex)  →  cc-map.mjs  →  claude-code/gentleman.json (72 slots rgb)
```

Lo que ya resolvió y hay que reutilizar:

- Traducción semántica OpenCode → Claude Code con mapa explícito.
- Regla de shimmer: los `*Shimmer` del dark real están **hand-tuned por slot**, no siguen
  fórmula. Decisión tomada: los shimmer reutilizan el color base verbatim en vez de inventar
  un lighten.
- Validación que simula el loader real (parse, base legal, filtro de slots, regex de color).

Resultado actual: **72/72 slots**, base `dark`, 0 slots descartados, validación de fidelidad
contra la paleta OpenCode en PASS.

Lo que **no** tiene: no valida contra el esquema del runtime instalado, no cubre OpenCode ni Pi,
y no emite salida humana.
