# Que Pilar pueda pedir cambios en cualquier momento

## Qué está pasando

Los tres logos abiertos hoy están en la etapa "En revisión". Con el flujo restaurado, los botones del asesor ("Aprobar diseño" y "Solicitar modificación") solo aparecen cuando el diseño está en "Listo para aprobación". Por eso Pilar ve el PDF, puede abrirlo y descargarlo, pero no tiene dónde rechazar ni escribir la nota del porqué.

## Cambio propuesto

1. **Pedir cambios siempre disponible**
   - Si ya hay un archivo ajustado cargado, el asesor ve el botón "Solicitar modificación" con su caja de texto, sin importar si el logo está en "En revisión", "Ajustado" o "Listo para aprobación".
   - Al enviar, el logo pasa a "Ajustes solicitados" y la nota queda visible para Diseño, como ya funciona hoy.

2. **Aprobar sigue igual**
   - "Aprobar diseño" continúa apareciendo únicamente cuando Diseño marca "Listo para aprobación", tal como pidió Lina.

3. **Aviso claro mientras tanto**
   - Cuando el logo aún no está listo, bajo el archivo se lee: "Diseño sigue trabajando en este logo — puedes pedir cambios, la aprobación se habilita cuando lo marquen como listo".

## Detalles técnicos

- Cambio acotado a `src/components/diseno/TrabajoDisenador.tsx`: separar la condición del bloque de revisión del asesor en dos (pedir cambios vs aprobar) en vez de la única condición actual `status === "listo_aprobacion"`.
- Sin cambios de base de datos: los permisos de actualización del asesor ya lo permiten y la lógica de `ajustes_solicitados` y del feedback ya existe.

## Verificación

- Con un logo en "En revisión": el asesor ve "Solicitar modificación", escribe la nota, y el logo pasa a "Ajustes solicitados" con el comentario visible para Diseño.
- Con un logo en "Listo para aprobación": aparecen ambos botones y aprobar sigue avanzando el pedido a estampación.
- Abrir y descargar PDF siguen funcionando igual.
