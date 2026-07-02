-- Seed pizzas (Manti Pizzeria meniu)
INSERT INTO pizzas (name, description, ingredients, price_small, price_large, image_url) VALUES
  ('Margherita', 'Klasikinė neapolietiška pica su šviežiu baziliku ir parmezanu', ARRAY['Trintų pomidorų padažas','Mozzarella','Parmigiano Reggiano','Alyvuogių aliejus','Šviežias bazilikas'], 10.00, 18.00, '/pizzas/margherita.jpg'),
  ('Margherita Piccante', 'Aštresnė Margherita su naminiu aštriu padažu ir jalapeño', ARRAY['Trintų pomidorų padažas','Mozzarella','Parmigiano Reggiano','Labai aštrus naminis padažas','Raudonųjų jalapeño griežinėliai','Šviežias bazilikas'], 11.00, 19.00, '/pizzas/margherita-piccante.jpg'),
  ('Vegetariana', 'Vegetariška pica su naminiu pesto ir pievagrybiais', ARRAY['Trintų pomidorų padažas','Mozzarella','Parmigiano Reggiano','Naminis pesto','Pievagrybiai','Šviežias bazilikas'], 12.00, 21.00, '/pizzas/vegetariana.jpg'),
  ('Blue Pepperoni', 'Pepperoni su gorgonzola ir aštriais pipirais', ARRAY['Trintų pomidorų padažas','Mozzarella','Pepperoni','Gorgonzola','Pepperoni pipirai','Šviežias bazilikas'], 13.00, 23.00, '/pizzas/blue-pepperoni.jpg'),
  ('Nduja', 'Aštri ''nduja su šviežia paprika ir raudonuoju svogūnu', ARRAY['Trintų pomidorų padažas','Mozzarella','''Nduja','Šviežia paprika','Šviežias raudonasis svogūnas'], 14.00, 25.00, '/pizzas/nduja.jpg'),
  ('Prosciutto Cotto', 'Pica su virtu kumpiu ir pievagrybiais', ARRAY['Trintų pomidorų padažas','Mozzarella','Virtas kumpis','Pievagrybiai','Šviežias bazilikas'], 13.00, 23.00, '/pizzas/prosciutto-cotto.jpg'),
  ('Salami Stracciatella', 'Saliamis su kremiška stracciatella ir baziliku', ARRAY['Trintų pomidorų padažas','Mozzarella','Saliamis','Stracciatella','Šviežias bazilikas','Alyvuogių aliejus'], 14.50, 26.00, '/pizzas/salami-stracciatella.jpg'),
  ('Serrano', 'Serrano kumpis su naminiu pesto ir rukola', ARRAY['Trintų pomidorų padažas','Mozzarella','Serrano kumpis','Naminis pesto','Parmigiano Reggiano','Rukola','Alyvuogių aliejus'], 14.50, 26.00, '/brand/pizza-simple.svg'),
  ('Honey Pepperoni', 'Pepperoni su aštriu medumi ir šviežiu baziliku', ARRAY['Trintų pomidorų padažas','Mozzarella','Pepperoni','Aštrus medus','Šviežias bazilikas'], 13.50, 24.00, '/brand/pizza-simple.svg')
ON CONFLICT DO NOTHING;

-- Seed tables
INSERT INTO restaurant_tables (number) VALUES (1), (2), (3), (4), (5)
ON CONFLICT DO NOTHING;
