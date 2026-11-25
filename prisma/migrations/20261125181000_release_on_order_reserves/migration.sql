INSERT INTO "stock_movements" ("nomenclature_id", "delta", "reason", "note")
SELECT oi.nomenclature_id, 0, 'cancel', 'Снят резерв ' || oi.qty || ', позиция на заказ'
FROM "order_items" oi
JOIN "listings" l ON l.id = oi.listing_id
WHERE oi.line_status = 'placed'
  AND oi.supply = false
  AND l.on_order = true
  AND oi.nomenclature_id IS NOT NULL;

UPDATE "nomenclature" n
SET "quantity_reserved" = GREATEST(0, n.quantity_reserved - sub.qty),
    "updated_at" = NOW()
FROM (
  SELECT oi.nomenclature_id, SUM(oi.qty)::int AS qty
  FROM "order_items" oi
  JOIN "listings" l ON l.id = oi.listing_id
  WHERE oi.line_status = 'placed'
    AND oi.supply = false
    AND l.on_order = true
    AND oi.nomenclature_id IS NOT NULL
  GROUP BY oi.nomenclature_id
) sub
WHERE n.id = sub.nomenclature_id;

UPDATE "listings" l
SET "quantity" = n.quantity_on_hand - n.quantity_reserved,
    "updated_at" = NOW()
FROM "nomenclature" n
WHERE l.nomenclature_id = n.id
  AND n.id IN (
    SELECT oi.nomenclature_id
    FROM "order_items" oi
    JOIN "listings" src ON src.id = oi.listing_id
    WHERE oi.line_status = 'placed'
      AND oi.supply = false
      AND src.on_order = true
      AND oi.nomenclature_id IS NOT NULL
  );

UPDATE "order_items" oi
SET "supply" = true
FROM "listings" l
WHERE l.id = oi.listing_id
  AND oi.line_status = 'placed'
  AND oi.supply = false
  AND l.on_order = true;
