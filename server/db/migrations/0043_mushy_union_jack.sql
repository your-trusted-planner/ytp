CREATE VIEW `client_relationships_bidirectional` AS 
  SELECT id, client_id, person_id, relationship_type, ordinal, notes, created_at, updated_at
  FROM client_relationships

  UNION ALL

  SELECT
    cr.id,
    u_related.id        AS client_id,
    u_owner.person_id   AS person_id,
    CASE cr.relationship_type
      WHEN 'SPOUSE'             THEN 'SPOUSE'
      WHEN 'EX_SPOUSE'          THEN 'EX_SPOUSE'
      WHEN 'PARTNER'            THEN 'PARTNER'
      WHEN 'CHILD'              THEN 'PARENT'
      WHEN 'PARENT'             THEN 'CHILD'
      WHEN 'STEPCHILD'          THEN 'STEPPARENT'
      WHEN 'STEPPARENT'         THEN 'STEPCHILD'
      WHEN 'GRANDCHILD'         THEN 'GRANDPARENT'
      WHEN 'GRANDPARENT'        THEN 'GRANDCHILD'
      WHEN 'SIBLING'            THEN 'SIBLING'
      WHEN 'BUSINESS_PARTNER'   THEN 'BUSINESS_PARTNER'
      WHEN 'BUSINESS_ASSOCIATE' THEN 'BUSINESS_ASSOCIATE'
    END                 AS relationship_type,
    cr.ordinal,
    cr.notes,
    cr.created_at,
    cr.updated_at
  FROM client_relationships cr
  JOIN users u_related ON u_related.person_id = cr.person_id
  JOIN users u_owner   ON u_owner.id = cr.client_id
  WHERE
    u_related.id != cr.client_id
    AND cr.relationship_type IN (
      'SPOUSE', 'EX_SPOUSE', 'PARTNER',
      'CHILD', 'PARENT', 'STEPCHILD', 'STEPPARENT',
      'GRANDCHILD', 'GRANDPARENT', 'SIBLING',
      'BUSINESS_PARTNER', 'BUSINESS_ASSOCIATE'
    )
;