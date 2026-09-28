# funky-theme-tui

Prototipos de tema Funky para terminales: **Claude Code**, **OpenCode** y **Pi**.

Genera 8 ficheros de tema desde una única tabla de mapeo y 54 tokens de paleta. Sin
dependencias, sin build step, sin `node_modules`.

> **Estado: prototipo.** Las paletas todavía están en revisión visual. La escalera de
> superficies es una decisión abierta, no un contrato estable. Ver
> [`odd/tasks/funky-tui-prototypes.md`](odd/tasks/funky-tui-prototypes.md) para el
> razonamiento completo y lo que falta por decidir.

## Las 4 variantes

| Variante | Claude Code | OpenCode | Pi |
|---|---|---|---|
| `dark` | ✅ | ✅ | ✅ |
| `darker` | ✅ | ✅ | ✅ |
| `dark-transparent` | ❌ | ✅ | ❌ |
| `darker-transparent` | ❌ | ✅ | ❌ |

`dark` y `darker` son **dos pasos de una escalera de tres**, no un par arbitrario: `dark` usa
la superficie que antes ocupaba `darker`, y `darker` queda near-black.

| Paso | base | deep | elevated |
|---|---|---|---|
| step 0 (referencia, no se shippea) | `#24212e` | `#211e2b` | `#2e2a3a` |
| step 1 `dark` | `#181520` | `#121018` | `#201d2a` |
| step 2 `darker` | `#0a0910` | `#060509` | `#13111a` |

Las variantes `-transparent` son idénticas a sus sólidas **salvo en `background`**, que pasa
a `"none"`. Solo OpenCode soporta transparencia real; Claude Code y Pi no tienen forma de
expresarla, así que no se generan variants para ellos en vez de generar una que mienta.

## Instalar

Copiá el `.json` al directorio de temas de tu terminal y activalo por nombre.

**Claude Code** — `~/.claude/themes/`

```jsonc
// ~/.claude/settings.json — el prefijo `custom:` es obligatorio para temas propios
{ "theme": "custom:funky-dark-prototype" }
```

**OpenCode** — `~/.config/opencode/themes/`

```jsonc
// ~/.config/opencode/opencode.json — nombre pelado, sin prefijo
{ "theme": "funky-dark-prototype" }
```

**Pi** — `~/.pi/agent/themes/`

```jsonc
// ~/.pi/agent/settings.json — nombre pelado, sin prefijo
{ "theme": "funky-dark-prototype" }
```

## Reconstruir y verificar

```bash
node prototypes/build-prototypes.mjs       # emite los 8 JSON desde los tokens de paleta
node prototypes/validate-prototypes.mjs    # 39 checks sobre los artefactos
node check-upstream.mjs                    # 28 checks de procedencia
```

El build es **determinista**: correrlo de nuevo sobre un árbol limpio no produce ni un byte
de diferencia. Eso es lo que permite versionar los artefactos generados sin que la
verificación dependa de compararlos contra un golden.

`check-upstream.mjs` es un **drift checker** read-only: lee `sources.json`, verifica por
SHA-256 cada artefacto registrado y cada fichero upstream de Pi, y reporta drift. Nunca
escribe ni borra nada, y sale con código 1 si hay algún fallo.

## Qué hay y qué no en este repo

**Se versiona:** los scripts de generación y verificación, la paleta, y los 8 JSON
generados.

**No se versiona:** los templates base y el tema `Gentleman-Cute` de los que deriva la
paleta. Son de otro proyecto (`gentle-pi`) y viven en su paquete npm; commitearlos sería
distribución no autorizada de material ajeno. `.gitignore` los excluye y `check-upstream.mjs`
falla si alguno aparece.

La procedencia completa está en [`SOURCES.md`](SOURCES.md) y
[`sources.json`](sources.json), con un hash por archivo excluido para que la exclusión siga
siendo auditable.
