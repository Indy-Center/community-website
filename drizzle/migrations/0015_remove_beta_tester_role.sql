-- The Beta Tester role is gone now that bookings are open to everyone
DELETE FROM `user_roles` WHERE `role` = 'beta:tester';
