# Decisiones y pruebas de aceptación

## Decisiones que debe confirmar la data

1. **Tabla totalmente calificada**: la notación entregada identifica dataset `silver` y tabla `ft_cl_planificacion_importaciones_industria`, pero falta confirmar el proyecto GCP.
2. **Fecha y cantidad**: descubrir los nombres y tipos reales antes de generar consultas productivas.
3. **KOMAX**: Power Query asigna primero `KOMAX S.A.` y luego intenta asignar `AXO`; la segunda rama nunca se ejecuta. Se preserva `KOMAX S.A.` hasta que negocio indique otra cosa.
4. **Tipos de accesorios**: `TIPO ACCESORIOS` evalúa `TIPO HOMOLOGADO`, aunque la regla anterior transforma tipos no reconocidos en `OTROS`. Validar si debe evaluar el `TIPO` original. Esta decisión afecta la apertura de accesorios.
5. **Duplicados de reglas**: HUSH PUPPIES KIDS, SPALDING y SALOMON aparecen repetidos con el mismo resultado; se consolidaron sin cambiar el resultado.
6. **SKECHER/SKECHERS y NORTH STAR/NORTHSTAR**: conservar variantes, medir volumen de cada una y decidir si normalizarlas.
7. **Pares y unidades**: el total combinado se permite porque replica el panel recibido, pero siempre debe estar rotulado; las aperturas por unidad deben seguir disponibles.
8. **Años discontinuos**: 2020 y 2021 no aparecen en la referencia. La interfaz debe usar años disponibles y señalar períodos incompletos.

## Pruebas de conciliación

- [ ] Totales base sin filtros documentados: filas, cantidad, FOB, fechas mínima/máxima.
- [ ] Totales con clase y unidad permitidas, comparados con la fuente.
- [ ] Total general coincide con suma por año, trimestre y mes.
- [ ] Total general coincide con suma por clase, segmento, género e importador.
- [ ] `SUM(US_FOB) / SUM(cantidad)` coincide con FOB unitario mostrado.
- [ ] Variación absoluta: actual menos comparación; variación porcentual: actual/comparación menos uno.
- [ ] Participaciones suman 100% dentro de cada universo filtrado, sujeto a redondeo.
- [ ] Filtros combinados no devuelven clases ni unidades fuera del universo autorizado.
- [ ] Forus se identifica como `FORUS S.A.`, recibe orden 1 y su participación usa el mismo denominador visible.
- [ ] Cobertura de cada homologación reportada por filas, cantidad y FOB.
- [ ] Nulos, denominadores cero y años parciales se muestran como no disponibles, no como cero ficticio.
- [ ] Exportación coincide con filtros, orden y cifras visibles.

## Umbral para habilitar el menú

No habilitar **Importaciones Industria Retail** hasta que las diferencias de cantidad y US$ FOB contra la consulta de control sean cero, o exista una excepción cuantificada y aprobada. Adjuntar una tabla con `métrica | fuente | portal | diferencia | diferencia % | explicación`.

