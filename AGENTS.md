# AGENTS.md

### Commits
- Conventional commits siempre en inglés.
- Un commit = una work unit (behavior, fix o docs). Nunca separar por tipo de archivo. Consultar la skill `work-unit-commits` para planificar los commits.
- **🚨 NUNCA commitear sin confirmar:** aunque el trabajo esté terminado y verificado, no asumir permiso — preguntar "¿commiteo?" salvo autorización explícita de la sesión. Aplica a ODD y a trabajo por fases: el usuario puede querer revisar el diff, reordenar o trabajar en paralelo. Una pregunta de 5 segundos evita revertir commits no deseados.

## Seguimiento ODD (`odd/`)
- `odd/` es caché local (no se trackea; el respaldo vive en Engram).
- Limpiar una feature SOLO si: feature cerrada en git Y espejo Engram sincronizado (sin pendientes). Si el sync de Engram falló, conservar el archivo local y reintentar.
