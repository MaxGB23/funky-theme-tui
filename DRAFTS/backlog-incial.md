Backlog v1 — Evolución multiplataforma de Funky Theme

Objetivo: evaluar la expansión de Funky Theme a VS Code, OpenCode y Pi manteniendo una única fuente de verdad para la identidad visual.

Diseñar una paleta semántica centralizada (colores base, variantes y roles semánticos).
Crear mappings/generadores por plataforma para adaptar la paleta a los tokens específicos de VS Code, OpenCode y Pi.
Evitar editar manualmente cada theme cuando cambie la paleta.
Evaluar si conviene un monorepo con todos los targets/generadores o repos separados con una fuente de paleta compartida.
Definir cómo distribuir cada target: VSIX / npm / catálogo de Pi / OpenCode.
Mantener la misma identidad visual, pero permitir ajustes específicos por plataforma cuando los sistemas de theming no tengan equivalencias 1:1.
Diseñar CI para generar, validar y publicar los distintos targets automáticamente.

Decisión pendiente: monorepo vs. repos independientes + estrategia de sincronización de la paleta.


Backlog v2
### Evolución multiplataforma de Funky Theme

*Objetivo:* expandir Funky Theme desde VS Code hacia terminales y coding agents, manteniendo una identidad visual consistente mediante una paleta centralizada.

*Targets iniciales:*

* VS Code
* OpenCode
* Pi
* Claude Code

*Variantes:* inicialmente *Dark* y *Darker*.

*Plan:*

* Mantener una *paleta de colores centralizada* como source of truth.
* Para los terminales/coding agents, partir de un *theme ya utilizado personalmente como template*, aprovechando su estructura y tokens existentes en lugar de diseñar el sistema desde cero. (Propuesto Gentle cute).
* Reemplazar/adaptar principalmente la *paleta de colores*, conservando la estructura y experiencia visual probada del template.
* Crear mappings/adaptadores específicos por plataforma, ya que los terminales no utilizan el mismo sistema de tokens que VS Code.
* Mantener la identidad visual de Funky sin forzar equivalencias 1:1 cuando una plataforma tenga conceptos o tokens diferentes.
* Automatizar la generación/sincronización para evitar modificar manualmente cada theme cuando cambie la paleta.
* Evaluar *monorepo vs. repositorios separados* y definir cómo compartir la fuente de verdad.
* Definir estrategia de distribución: *VSIX, Pi Package/Market, OpenCode y Claude Code*.
* Considerar CI para validar, generar y publicar los diferentes targets.

*Decisiones pendientes:*

1. Monorepo vs. repos separados.
2. Estructura definitiva de la paleta/source of truth.
3. Sistema de mappings y generación.
4. Estrategia de versionado y publicación por plataforma.


THEMES ORIGINALES DE FUNKY THEME VSCODE ./vscode-themes, probablemente lleven exactamente los mismos colores para codigo y backgrounds que sean compatibles con terminales. gentleman themes se usarán como base para reemplazar quirurgicamente keys que ya han sido probadas, gentle theme es un theme popular y testeado. No se incluiran variantes como italic, hc, etc, solo dark y darker. Pero viento el theme base de gentleman, mezcla italics minimas, esto tambien lo heredará funky dark y darker, es aceptado.
