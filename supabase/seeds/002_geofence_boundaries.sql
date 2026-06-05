-- ACCURATE Geofence Polygon Boundaries for Accra Areas
-- Provide the boundary coordinates in [lng, lat] format

-- Mamprobi boundary (approximate)
-- North: Kaneshie Rd, South: High St, East: Graphic Rd, West: Boundary Rd
-- UPDATE geofences SET boundary = '[[-0.2371, 5.545], [-0.245, 5.525], [-0.255, 5.525], [-0.255, 5.545]]' WHERE name = 'Mamprobi';

-- Accra Central (Makola area)
-- Around Makola Market, bounded by High Street, Independence Ave, Oxford St
-- UPDATE geofences SET boundary = '[[-0.198, 5.552], [-0.202, 5.548], [-0.208, 5.548], [-0.208, 5.552]]' WHERE name = 'Accra Central';

-- Circle (Kwame Nkrumah Circle area)
-- Around Circle, bounded by Kaneshie Rd, Independence Ave, Oxford St, Boundary Rd  
-- UPDATE geofences SET boundary = '[[-0.215, 5.575], [-0.205, 5.565], [-0.215, 5.565], [-0.215, 5.575]]' WHERE name = 'Circle';

-- Dansoman (Dansoman Estate)
-- Large estate, multiple phases - approximate bounds
-- UPDATE geofences SET boundary = '[[-0.29, 5.57], [-0.26, 5.54], [-0.29, 5.54], [-0.29, 5.57]]' WHERE name = 'Dansoman';

-- Kaneshi (Kanneshie)
-- From Kaneshie Roundabout to Abbyssekoom
-- UPDATE geofences SET boundary = '[[-0.19, 5.58], [-0.23, 5.56], [-0.19, 5.56], [-0.19, 5.58]]' WHERE name = 'Kaneshi';

-- Provide accurate coordinates to replace these approximate values