# Hacer visible la gestión de productos y referencias

## Cambios
- Agregar una pestaña destacada **Productos y referencias** al inicio de la navegación principal del usuario de Inventarios.
- Dentro de ella, permitir alternar claramente entre **Magical Warmers** y **Sweatspot**, mostrando los catálogos existentes con sus controles de creación.
- Mantener las acciones por referencia con iconos familiares: lápiz para editar, papelera para eliminar, check para guardar y X para cancelar.
- Añadir etiquetas accesibles y ayudas al pasar el cursor sobre los iconos para que cada acción sea inequívoca.
- Ajustar la barra de pestañas para que sea navegable en pantallas donde actualmente algunas opciones quedan ocultas.

## Validación
- Comprobar que el rol Inventarios vea la nueva pestaña sin desplazarse hasta opciones ocultas.
- Verificar que agregar, editar y eliminar sigan limitados a Admin e Inventarios.
- Validar la interfaz en la vista actual y comprobar que no haya errores de TypeScript.
