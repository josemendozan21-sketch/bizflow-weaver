# Recompras: que la asesora diga claramente "logo tal cual" o "logo con ajuste"

## Qué encontré
- En los últimos 30 días, Pilar registró 100 pedidos y **ninguno quedó marcado como recompra**. El interruptor "Recompra" está escondido en "Opciones adicionales", y la pregunta "¿Usará el mismo logo?" solo aparece si se activa.
- Como vuelve a subir el archivo del logo, la app lo toma como **logo nuevo** y abre solicitud en Diseño. Por eso Lucy ve "Ajuste de logo en Diseño — no revelar" aunque el logo sea igual.
- Ejemplo: Luisa León (MW-PB-01656), Marcela Gutiérrez (MW-PB-01659) y Alejandra Correa (MW-PB-01665) entraron como "logo nuevo" y esperaron a Diseño hasta hoy a las 9:30 a. m. Ya están aprobadas y en Producción, así que hoy no tienen la etiqueta roja.
- Ojo: Marcela Gutiérrez **MW-PB-01658** sí tiene ajustes pedidos por Diseño. Esa sí debe esperar.

## Qué cambia
1. **Pregunta obligatoria sobre el logo**, en Magical Warmers y Sweat Spot mayorista, arriba de donde se sube el logo. Hay que elegir una opción para poder guardar:
   - **Logo nuevo** → va a Diseño (igual que hoy).
   - **Recompra — logo tal cual** → no va a Diseño. Producción lo recibe sin etiqueta roja y con el aviso verde "Recompra — mismo logo".
   - **Recompra — logo con ajuste** → hay que escribir qué se ajusta. Va a Diseño, y Producción ve "Ajuste de logo en Diseño — no revelar" hasta que se apruebe.
   - **Sin logo**.
2. **Recompra tal cual sin volver a subir el archivo**: la app sugiere el logo aprobado de pedidos anteriores del mismo cliente (por cédula/NIT o nombre). Si la asesora prefiere, puede subir el archivo de nuevo y sigue contando como "tal cual", sin solicitud en Diseño.
3. **Aviso de recompra**: si la cédula/NIT ya tiene pedidos anteriores y la asesora marca "Logo nuevo", sale el aviso "Este cliente ya compró antes. ¿Es recompra?". El aviso no bloquea.
4. **En Producción**, en la tarjeta: "Recompra — mismo logo" (verde), "Ajuste de logo en Diseño — no revelar" (rojo, solo si de verdad hay ajuste) o "Logo nuevo".
5. **Pedidos de Pilar abiertos hoy**: no cambio nada sin confirmación. Si me dices cuáles dos eran recompra tal cual, los marco como recompra y cierro su solicitud de Diseño para quitar la etiqueta.

## Detalles técnicos
- Ventas.tsx (MW y SS): la pregunta reemplaza al interruptor Recompra y a "¿mismo logo?" con un selector `logoMode` obligatorio que fija `isRecompra`, `recompraMismoLogo` y `needsLogoAdjustment`. Si es "con ajuste", la nota es obligatoria y se guarda en `additional_instructions`.
- En "tal cual" con archivo subido: se sube a storage sin crear `logo_request`, y queda `logo_source='reutilizado'`.
- Sugerencia del logo anterior: consulta a `orders`/`logo_requests` aprobadas con el mismo `client_nit` o nombre.
- EstampacionProductionView: badge según `is_recompra` y `logo_source`. No cambian la regla del trigger ni el bloqueo de Diseño.
- Prueba unitaria para mapear `logoMode` → flags (tal cual no crea solicitud; con ajuste sí).
