-- Характеристика, которая есть у каждого листа ветки, переносится на верхний раздел этой ветки.
-- Значения объявлений и номенклатуры остаются, ссылка переключается на общую запись.

DO $$
DECLARE
  parent_row record;
  code_row record;
  old_row record;
  leaf_total int;
  leaves_with int;
  canonical int;
  source_id int;
BEGIN
  FOR parent_row IN
    WITH RECURSIVE depth AS (
      SELECT id, 0 AS level FROM categories WHERE parent_id IS NULL
      UNION ALL
      SELECT child.id, depth.level + 1
      FROM categories child
      JOIN depth ON child.parent_id = depth.id
    )
    SELECT categories.id
    FROM categories
    JOIN depth ON depth.id = categories.id
    WHERE EXISTS (SELECT 1 FROM categories child WHERE child.parent_id = categories.id)
    ORDER BY depth.level ASC, categories.id ASC
  LOOP
    WITH RECURSIVE tree AS (
      SELECT id FROM categories WHERE parent_id = parent_row.id
      UNION ALL
      SELECT child.id FROM categories child JOIN tree ON child.parent_id = tree.id
    )
    SELECT count(*) INTO leaf_total
    FROM tree
    WHERE NOT EXISTS (SELECT 1 FROM categories child WHERE child.parent_id = tree.id);

    IF leaf_total = 0 THEN
      CONTINUE;
    END IF;

    FOR code_row IN
      WITH RECURSIVE tree AS (
        SELECT id FROM categories WHERE id = parent_row.id
        UNION ALL
        SELECT child.id FROM categories child JOIN tree ON child.parent_id = tree.id
      )
      SELECT DISTINCT attribute_defs.code
      FROM attribute_defs
      WHERE attribute_defs.category_id IN (SELECT id FROM tree)
    LOOP
      WITH RECURSIVE tree AS (
        SELECT id FROM categories WHERE parent_id = parent_row.id
        UNION ALL
        SELECT child.id FROM categories child JOIN tree ON child.parent_id = tree.id
      )
      SELECT count(*) INTO leaves_with
      FROM tree
      WHERE NOT EXISTS (SELECT 1 FROM categories child WHERE child.parent_id = tree.id)
        AND EXISTS (
          SELECT 1 FROM attribute_defs
          WHERE attribute_defs.category_id = tree.id AND attribute_defs.code = code_row.code
        );

      IF leaves_with < leaf_total THEN
        CONTINUE;
      END IF;

      canonical := (
        SELECT attribute_defs.id
        FROM attribute_defs
        WHERE attribute_defs.category_id = parent_row.id AND attribute_defs.code = code_row.code
        ORDER BY attribute_defs.id
        LIMIT 1
      );

      IF canonical IS NULL THEN
        WITH RECURSIVE up AS (
          SELECT id, parent_id, 0 AS dist FROM categories WHERE id = parent_row.id
          UNION ALL
          SELECT parent.id, parent.parent_id, up.dist + 1
          FROM categories parent
          JOIN up ON parent.id = up.parent_id
        )
        SELECT attribute_defs.id INTO canonical
        FROM up
        JOIN attribute_defs ON attribute_defs.category_id = up.id AND attribute_defs.code = code_row.code
        WHERE up.id <> parent_row.id
        ORDER BY up.dist, attribute_defs.id
        LIMIT 1;
      END IF;

      IF canonical IS NULL THEN
        source_id := (
          WITH RECURSIVE tree AS (
            SELECT id FROM categories WHERE parent_id = parent_row.id
            UNION ALL
            SELECT child.id FROM categories child JOIN tree ON child.parent_id = tree.id
          )
          SELECT attribute_defs.id
          FROM attribute_defs
          WHERE attribute_defs.code = code_row.code
            AND attribute_defs.category_id IN (SELECT tree.id FROM tree)
          ORDER BY attribute_defs.card_order, attribute_defs.id
          LIMIT 1
        );
        IF source_id IS NULL THEN
          CONTINUE;
        END IF;

        INSERT INTO attribute_defs (category_id, code, name, unit, filterable, card_order, data_type)
        SELECT parent_row.id, code, name, unit, filterable, card_order, data_type
        FROM attribute_defs
        WHERE id = source_id
        RETURNING id INTO canonical;
      END IF;

      FOR old_row IN
        WITH RECURSIVE tree AS (
          SELECT id FROM categories WHERE parent_id = parent_row.id
          UNION ALL
          SELECT child.id FROM categories child JOIN tree ON child.parent_id = tree.id
        )
        SELECT attribute_defs.id
        FROM attribute_defs
        WHERE attribute_defs.code = code_row.code
          AND attribute_defs.category_id IN (SELECT id FROM tree)
          AND attribute_defs.id <> canonical
      LOOP
        UPDATE listing_attributes
        SET attribute_def_id = canonical
        WHERE attribute_def_id = old_row.id
          AND NOT EXISTS (
            SELECT 1 FROM listing_attributes existing
            WHERE existing.listing_id = listing_attributes.listing_id
              AND existing.attribute_def_id = canonical
          );
        DELETE FROM listing_attributes WHERE attribute_def_id = old_row.id;

        UPDATE nomenclature_attributes
        SET attribute_def_id = canonical
        WHERE attribute_def_id = old_row.id
          AND NOT EXISTS (
            SELECT 1 FROM nomenclature_attributes existing
            WHERE existing.nomenclature_id = nomenclature_attributes.nomenclature_id
              AND existing.attribute_def_id = canonical
          );
        DELETE FROM nomenclature_attributes WHERE attribute_def_id = old_row.id;

        DELETE FROM attribute_defs WHERE id = old_row.id;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
