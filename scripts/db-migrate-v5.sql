-- Migration v5: единая валюта — бонусы за всё

-- Салон «Мак»: 20 000 шагов = 20 бонусов (при курсе 1000:1)
UPDATE promo_codes SET
  cost_points = 20,
  required_steps = 0,
  description = 'Скидка 10% на услуги салона. Стоимость: 20 бонусов (≈ 20 000 шагов).'
WHERE code = 'MAK-SALON-10';

-- Убираем пороги шагов у всех акций — только бонусы
UPDATE promo_codes SET required_steps = 0 WHERE required_steps > 0;
