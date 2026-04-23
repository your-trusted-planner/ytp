-- Migrate client_relationships to relationships table before dropping
INSERT OR IGNORE INTO relationships (                                                                                       
  id, from_person_id, to_person_id, relationship_type, ordinal, notes, created_at, updated_at
)                                                                                                                           
SELECT                                              
  cr.id,                                                                                                                    
  p.id AS from_person_id,      -- person who is the client
  cr.person_id AS to_person_id, -- the related person                                                                       
  cr.relationship_type,                                                                                                     
  cr.ordinal,                                                                                                               
  cr.notes,                                                                                                                 
  cr.created_at,                                    
  cr.updated_at
FROM client_relationships cr                                                                                                
INNER JOIN users u ON cr.client_id = u.id
INNER JOIN people p ON u.person_id = p.id                                                                                   
WHERE NOT EXISTS (                                  
  SELECT 1 FROM relationships r
  WHERE r.id = cr.id                                                                                                        
);
DROP TABLE `client_relationships`;--> statement-breakpoint
DROP VIEW `client_relationships_bidirectional`;