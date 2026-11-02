# Toolbox AP - métricas de inventario

Fuente funcional: `Ejemplo Panel Marca (002).xlsx` y `Reportes_RoadMaps_2023-Febrero_Challenge_abrilreal_rkf_vestuario_inv24.xlsx`.

## SFINAL

Saldo final mensual valorizado:

`SFINAL = SINICIAL + COMPRAS + SALIDAS`

En los libros fuente las salidas se almacenan con signo negativo. El saldo final de cada mes pasa a ser el saldo inicial del mes siguiente.

## Días financieros

`Días financieros = SFINAL / costo de venta diario acumulado`

El costo diario acumulado se calcula como salidas acumuladas divididas por `30 × número de mes`. La fórmula original aplica el signo inverso porque las salidas se registran negativas.

## Días de cobertura

`Días cobertura = SFINAL / (salidas futuras de 12 meses / 360)`

Mide cuántos días puede sostener el inventario final frente al consumo futuro estimado. El modelo Roadmap también contiene variantes de cobertura a 3, 6 y 12 meses.

## GMROI

`GMROI = margen bruto anualizado / inventario promedio`

El margen bruto acumulado corresponde a `Venta × Margen %`; luego se anualiza según los meses transcurridos y se divide por el inventario final promedio acumulado.

## Relaciones auxiliares

- `Venta TY = Venta LY × (1 + variación TY/LY)`.
- `Compras unidades = Compras valorizadas × 1.000.000 / costo promedio de compra`.
- `Salidas unidades = Salidas valorizadas × 1.000.000 / costo promedio de venta`.
- `Costo promedio compra CLP = costo promedio compra USD × tipo de cambio`.
