
## Resumen

Crear una nueva sección **Redes Bionovations** en el menú lateral, con 3 sub-pestañas por marca (Bionovations SAS, Sweatspot, Magical Warmers). Cada pestaña muestra un calendario mensual donde se programan publicaciones y fechas especiales.

## Acceso

- Admin
- Diseñador
- Nuevo rol **Community Manager** (`community_manager`)

El Community Manager solo verá esta pestaña (similar a cómo `feria_pos` solo ve Feria POS).

## Estructura visual

- Nueva entrada en el sidebar: **Redes Bionovations** (icono Megaphone), ruta `/redes`.
- Página `Redes.tsx` con tabs:
  - Bionovations SAS
  - Sweatspot
  - Magical Warmers
- Cada tab renderiza el mismo componente `BrandSocialCalendar` filtrado por marca.

## Calendario

Vista mensual con navegación mes anterior / mes siguiente. Cada día muestra los chips de las publicaciones/fechas especiales programadas. Click en un día abre un diálogo con la lista del día y botón "Agregar publicación". Click en un chip abre el detalle para editar/eliminar.

```text
┌─────────────────────────────────────────┐
│  ‹  Junio 2026  ›       [+ Nueva]       │
├──┬──┬──┬──┬──┬──┬──┤
│Lu│Ma│Mi│Ju│Vi│Sá│Do│
├──┼──┼──┼──┼──┼──┼──┤
│ 1│ 2│●3│ 4│★5│ 6│ 7│  ● post  ★ fecha especial
└──┴──┴──┴──┴──┴──┴──┘
```

## Formulario de publicación

Campos:
- Título
- Fecha (date picker)
- Red social: Instagram, Facebook, TikTok, WhatsApp, Otra (multi-select)
- Estado: Idea / Programado / Publicado
- Descripción/copy (textarea larga)
- Hashtags (textarea)
- Imagen o archivo adjunto (upload a Storage)
- Checkbox **"Fecha especial"** (efeméride, lanzamiento, etc.) — cuando está marcado se muestra con estilo distinto (estrella dorada) en el calendario

## Detalles técnicos

### Base de datos

Nuevo enum `app_role` valor `community_manager`.

Nueva tabla `public.social_posts`:

| columna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| brand | text | 'bionovations' \| 'sweatspot' \| 'magical' |
| scheduled_date | date | NOT NULL |
| title | text | NOT NULL |
| description | text | copy del post |
| hashtags | text | |
| networks | text[] | ig, fb, tiktok, wsp, otra |
| status | text | idea/programado/publicado, default 'programado' |
| is_special_date | boolean | default false |
| asset_url | text | URL pública del archivo |
| asset_path | text | path en storage |
| created_by | uuid | auth.uid() |
| created_by_name | text | |
| created_at / updated_at | timestamptz | |

GRANT + RLS:
- SELECT/INSERT/UPDATE/DELETE para `admin`, `disenador`, `community_manager` (via `has_role`).
- Trigger `update_updated_at_column` existente.

Nuevo bucket público **`social-media-assets`** para imágenes/videos del calendario.

### Frontend

Archivos nuevos:
- `src/pages/Redes.tsx`
- `src/components/redes/BrandSocialCalendar.tsx` (grid de mes con días)
- `src/components/redes/SocialPostDialog.tsx` (crear/editar)
- `src/components/redes/SocialPostChip.tsx` (chip dentro de la celda del día)
- `src/hooks/useSocialPosts.ts` (fetch + realtime + mutations)

Archivos modificados:
- `src/App.tsx` — ruta `/redes`
- `src/components/AppSidebar.tsx` — item "Redes Bionovations" (icono Megaphone)
- `src/lib/rolePermissions.ts` — agregar `community_manager`, dar acceso `/redes` a admin/disenador/community_manager, edit en mismas; el community_manager solo ve `/redes`
- `src/integrations/supabase/types.ts` se regenera automáticamente

### Notas

- No tocaremos otros módulos.
- El nuevo rol se podrá asignar desde Admin → Usuarios igual que los demás.
- Los archivos se suben al bucket `social-media-assets` con path `{brand}/{post_id}/{filename}`.
