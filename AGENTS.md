# AGENTS.md

### Commits
- Conventional commits siempre en inglés.
- Un commit = una work unit (behavior, fix o docs). Nunca separar por tipo de archivo. Consultar la skill `work-unit-commits` para planificar los commits.
- **🚨 NUNCA commitear sin confirmar:** aunque el trabajo esté terminado y verificado, no asumir permiso — preguntar "¿commiteo?" salvo autorización explícita de la sesión. Aplica a ODD y a trabajo por fases: el usuario puede querer revisar el diff, reordenar o trabajar en paralelo. Una pregunta de 5 segundos evita revertir commits no deseados.

### Upstream y proceso (ver docs/UPSTREAM.md)
- Solo Pi tiene upstream con diff: `Gentleman-Cute.json` y nada más. `Gentleman` jubilado.
- Install dirs = lab, repo = verdad. Reportar diffs instalados slot por slot; el usuario elige qué se promueve; solo el lado repo se commitea.
- Tras cada update de `gentle-pi`: `node scripts/check-upstream.mjs`, re-pinear con drift, fechar la tabla de UPSTREAM.md.
- OpenCode/Claude: key-checks trimestrales contra fuentes oficiales; actualizar `Last revision`.
- Carpetas: lo nuevo nace con el trabajo que lo necesita (`themes/` en el pass 0.1.0); nada especulativo en root. `inbox/` = promover o borrar; `git add -f` para evidencia deliberada.

### Engram
- La memoria histórica de este proyecto vive bajo el project name legacy `funky-theme-opencode` (el cwd actual es `funky-theme-tui`). Para accederla, pasar `project: "funky-theme-opencode"` explícitamente; sin eso el auto-detect cae en `funky-theme-tui`, donde nace la memoria nueva.
