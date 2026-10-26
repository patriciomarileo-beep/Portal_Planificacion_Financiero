# Prompt maestro — Importaciones Industria Retail

Trabaja sobre `C:\Users\aparada\Desktop\Rentabilidad Tiendas 2027 v2` y conserva la arquitectura, diseño, autenticación y navegación existentes. El proyecto contiene `.openai/hosting.json`, por lo que debes seguir el skill `sites-building`; usa `sites-hosting` solo si se solicita publicar. No reemplaces el shell del portal.

## Objetivo

Implementar y habilitar **Mercado → Importaciones Industria Retail** como un módulo financiero dinámico alimentado exclusivamente desde BigQuery. La fuente confirmada es `forus-analitica-test-datalake.silver.ft_cl_planificacion_importaciones_industria`. No inventes datos ni nombres de campos.

## Fuente y seguridad

- Ejecuta la conexión únicamente desde la red oficial de Forus.
- Reutiliza el helper BigQuery existente (`app/api/_shared/bigquery.ts`) y las credenciales del entorno; nunca expongas credenciales ni consultes BigQuery directamente desde el navegador.
- Empieza con las consultas de `DIAGNOSTICO_BIGQUERY.sql` y registra el nombre totalmente calificado confirmado.
- Aplica las reglas de `REGLAS_NEGOCIO.json` en SQL o en una capa compartida del servidor. Debe existir una única fuente de verdad, probada y reutilizable.
- Limita el universo a `anio >= 2023`, `CLASE IN ('CALZADO','VESTUARIO','ACCESORIOS')` y `UNIDAD IN ('PARES','UNIDADES')`, normalizando espacios y mayúsculas antes de comparar. Los años 2019 y 2022 no deben extraerse ni participar en ningún cálculo.

## Diseño funcional

Construye una experiencia propia del portal, no una copia literal del menú de Power BI. Usa pestañas dentro del módulo:

1. **Resumen ejecutivo**: tarjetas para pares/unidades, US$ FOB, FOB unitario ponderado, variación interanual, participación FOB de Forus y posición de Forus; tendencia mensual/trimestral/anual con volumen en columnas y US$ FOB o FOB unitario en línea.
2. **Segmentos**: matriz expandible `Segmento → Clase`, con años dinámicos, participación, variación absoluta y porcentual, para volumen y US$ FOB. Añade formato condicional sobrio.
3. **Importadores**: ranking y participación por importador, destacando Forus; evolución y tabla ordenable con volumen, FOB, FOB unitario, variación y mix.
4. **Marcas y tipos**: análisis por marca, clase, tipo homologado, género y grupo; tabla detallada y gráfico horizontal de FOB unitario ponderado por año.

Filtros globales: año y el control temporal `ANUAL · Q1 · Q2 · Q3 · Q4 · MES`, además de clase, unidad, segmento, importador, marca, género y tipo. Valores iniciales: las tres clases permitidas y ambas unidades permitidas. Indica siempre el alcance seleccionado como “Pares y unidades”; no mezcles magnitudes sin etiqueta.

El cálculo correcto es `FOB unitario = SUM(US_FOB) / SUM(cantidad)`, nunca el promedio de costos unitarios por fila. Las participaciones deben recalcularse dentro del universo filtrado. Las comparaciones deben adaptarse a los años presentes; conserva 22/19, 23/22 y 24/23 solo cuando existan esos períodos.

## Arquitectura esperada

- Crea endpoints agregados y parametrizados para `options`, `summary`, `trend`, `segments`, `importers` y `brands-types`; evita descargar la tabla completa al cliente.
- Valida todas las dimensiones contra listas obtenidas del servidor y parametriza fechas/filtros.
- Implementa caché corta por combinación de filtros si el runtime existente lo permite, sin agregar infraestructura especulativa.
- Mantén estados claros de carga, vacío, error y dato no disponible. La exportación debe respetar exactamente los filtros activos.
- Cambia el ítem lateral existente `importaciones-retail` a “Importaciones Industria Retail” y habilítalo solo cuando endpoints, conciliación y UI estén listos.

## Controles obligatorios antes de habilitar

1. Conciliar conteo de filas, cantidad, US$ FOB y rango de fechas entre fuente y universo filtrado.
2. Medir cobertura de homologación y listar `SIN CLASIFICACIÓN`, `OTROS` y nulos por regla.
3. Resolver o documentar los hallazgos de `DECISIONES_Y_PRUEBAS.md`, especialmente KOMAX y accesorios.
4. Validar que total = suma de segmentos, clases, importadores y géneros para cada combinación de filtros.
5. Verificar ponderación del FOB unitario, denominadores cero, duplicados y años incompletos.
6. Ejecutar pruebas, `npm run build` y revisión visual en escritorio y resolución portátil.

## Criterio de término

Entrega el módulo funcional con datos reales, un resumen de conciliación (totales, diferencias y cobertura), archivos modificados y resultado de pruebas. No publiques ni modifiques permisos externos salvo instrucción expresa.
