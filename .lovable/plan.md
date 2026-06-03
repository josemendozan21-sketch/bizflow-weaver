## Corte de Rollos — Nueva pestaña en Producción

Una pestaña dentro de **Producción** para registrar el corte de rollos grandes (150 cm) de plástico **calor** o **frío** en rollos pequeños (15–28 cm), con código, peso y registro de uso.

### Flujo

**1. Cortar rollo grande → genera rollos pequeños**
Formulario para registrar el corte:
- Tipo: Calor o Frío
- Medida de corte (cm): 15–28
- Cantidad de rollos pequeños generados
- Peso inicial de cada rollo (gramos) — un campo por rollo
- Operario que cortó (texto libre)

Al guardar, se crea un registro por cada rollo pequeño con código autogenerado:
- **Formato:** `RC-28-0306` (Calor, 28 cm, 03 jun) o `RF-20-0306` (Frío, 20 cm)
- Si hay varios el mismo día con misma medida y tipo, se agrega sufijo: `RC-28-0306-A`, `-B`, `-C`...

**2. Listado de rollos pequeños (estado: disponible)**
Tabla/cards con: código, tipo, medida, peso inicial, fecha de corte, operario.
Filtros por tipo y estado (disponible / en uso / consumido).

**3. Montar rollo para producción**
Botón "Iniciar uso" en un rollo disponible:
- Operario (texto libre)
- Notas: qué se va a hacer con el rollo
- Hora de inicio (automática)
- Estado pasa a **en uso**

**4. Finalizar uso del rollo**
Botón "Finalizar":
- Peso final (gramos)
- Notas finales (qué se produjo, observaciones)
- Hora de finalización (automática)
- Estado pasa a **consumido**

La tarjeta muestra: peso inicial, peso final, diferencia (gramos consumidos), duración, operario, notas.

### Detalles técnicos

**Nueva tabla `roll_cuts`** en la base de datos:
- `id`, `code` (único), `tipo` (calor/frio), `medida_cm`, `peso_inicial_g`, `peso_final_g`
- `cortado_por`, `cortado_at`
- `montado_por`, `montado_at`, `notas_inicio`
- `finalizado_por`, `finalizado_at`, `notas_final`
- `status` (disponible / en_uso / consumido)
- RLS: producción + admin gestionan; visual y otros roles autorizados pueden ver

**Frontend:**
- Nueva pestaña en `src/pages/Produccion.tsx` (o dentro del flujo de Magical Warmers, ya que aplica a cuerpos calor/frío). **Propongo agregarla como nueva sección en la vista principal de Producción**, accesible tanto desde Magical Warmers como independientemente, ya que los rollos abastecen la producción de cuerpos.
- Componentes nuevos:
  - `RollCutsView.tsx` — pestaña/tab principal con listado + filtros
  - `CreateRollCutDialog.tsx` — formulario de corte (genera N rollos)
  - `StartRollUsageDialog.tsx` — montar rollo
  - `FinishRollUsageDialog.tsx` — finalizar con peso final
  - `RollCutCard.tsx` — tarjeta de cada rollo con su historial

**Sin cálculos automáticos** de unidades por ahora — solo se registran pesos y notas. Más adelante podemos agregar cálculo automático si defines el peso estándar por referencia.

### Ubicación de la pestaña

Dentro de `/produccion`, agregar tabs en la parte superior:
- **Magical Warmers** (actual)
- **Sweatspot** (actual)
- **Corte de Rollos** (nuevo) — visible para roles de producción y admin

¿Procedo con esta implementación?