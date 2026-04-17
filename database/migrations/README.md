# Guía de Migración de Base de Datos para Logros

## Problema Identificado

La tabla `userAchievements` tiene un esquema incorrecto que impide que múltiples usuarios tengan el mismo logro. La PRIMARY KEY actual es solo `achievementId`, lo cual causa conflictos cuando más de un usuario intenta desbloquear el mismo logro.

## Solución

Ejecutar el script de migración para:
1. Agregar una columna `id` como PRIMARY KEY
2. Crear un constraint UNIQUE en `(id_User, achievementId)`
3. Agregar índices para mejor rendimiento

## Pasos para Aplicar la Migración

### Opción 1: Usando Supabase Dashboard (RECOMENDADO)

1. Abre tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **SQL Editor** en el menú lateral
3. Haz clic en **New Query**
4. Copia y pega **TODO** el contenido de `docs/migrations/fix_userAchievements_schema.sql`
5. Haz clic en **Run** (o presiona Ctrl+Enter)
6. Verifica que aparezca "Success. No rows returned" o similar

### Opción 2: Usando psql o cliente de PostgreSQL

```bash
psql -h [tu-host] -U [tu-usuario] -d [tu-database] -f docs/migrations/fix_userAchievements_schema.sql
```

## Verificación

Después de ejecutar la migración, verifica que funcionó correctamente:

```sql
-- Verificar la estructura de la tabla
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'userAchievements'
ORDER BY ordinal_position;

-- Debería mostrar una columna 'id' de tipo integer
-- Verificar constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'userAchievements';

-- Debería mostrar:
-- - userAchievements_pkey (PRIMARY KEY en 'id')
-- - userAchievements_user_achievement_unique (UNIQUE en 'id_User', 'achievementId')
```

## Troubleshooting

### Error: "column id already exists"
Si ya ejecutaste parte de la migración, puedes omitir los pasos ya completados. Verifica qué ya existe:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'userAchievements' AND column_name = 'id';
```

### Error: "constraint already exists"
Esto significa que ya ejecutaste ese paso. Puedes continuar con los siguientes pasos.

## Después de la Migración

1. **Reinicia el servidor backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Prueba la aplicación:**
   - Ve a la página de logros
   - Haz clic en "Actualizar Progreso"
   - Los logros desbloqueados deberían aparecer correctamente

3. **Verifica que funciona:**
   - Crea una tarea nueva
   - Completa una tarea
   - Verifica que el progreso de logros se actualice

