INSERT INTO buildings (id, name, address, is_active) VALUES
(1, 'HQ Tower',         '100 Main Street, Springfield',   true),
(2, 'North Campus',     '250 North Avenue, Springfield',  true),
(3, 'Riverside Office', '12 River Road, Springfield',     true),
(4, 'Tech Center',      '8 Innovation Way, Springfield',  true),
(5, 'Annex West',       '77 West Boulevard, Springfield', true);
 
 
-- -------------------------------------------------------------------------
-- Floors (4 per building)
-- -------------------------------------------------------------------------
INSERT INTO floors (id, floor_number, capacity, building_id, is_active) VALUES
(1,  1, 10, 1, true),
(2,  2, 10, 1, true),
(3,  3, 10, 1, true),
(4,  4, 10, 1, true),
(5,  1, 10, 2, true),
(6,  2, 10, 2, true),
(7,  3, 10, 2, true),
(8,  4, 10, 2, true),
(9,  1, 10, 3, true),
(10, 2, 10, 3, true),
(11, 3, 10, 3, true),
(12, 4, 10, 3, true),
(13, 1, 10, 4, true),
(14, 2, 10, 4, true),
(15, 3, 10, 4, true),
(16, 4, 10, 4, true),
(17, 1, 10, 5, true),
(18, 2, 10, 5, true),
(19, 3, 10, 5, true),
(20, 4, 10, 5, true);
 
 
-- -------------------------------------------------------------------------
-- Seats (10 per floor; seat 9 = meeting room, seat 10 = common area)
-- -------------------------------------------------------------------------
INSERT INTO seats (id, seat_type, floor_id, is_active) VALUES
-- HQ Tower, floor 1
(1,   'Desk',         1,  true),
(2,   'Desk',         1,  true),
(3,   'Desk',         1,  true),
(4,   'Desk',         1,  true),
(5,   'Desk',         1,  true),
(6,   'Desk',         1,  true),
(7,   'Desk',         1,  true),
(8,   'Desk',         1,  true),
(9,   'Meeting Room', 1,  true),
(10,  'Common Area',  1,  true),
-- HQ Tower, floor 2
(11,  'Desk',         2,  true),
(12,  'Desk',         2,  true),
(13,  'Desk',         2,  true),
(14,  'Desk',         2,  true),
(15,  'Desk',         2,  true),
(16,  'Desk',         2,  true),
(17,  'Desk',         2,  true),
(18,  'Desk',         2,  true),
(19,  'Meeting Room', 2,  true),
(20,  'Common Area',  2,  true),
-- HQ Tower, floor 3
(21,  'Desk',         3,  true),
(22,  'Desk',         3,  true),
(23,  'Desk',         3,  true),
(24,  'Desk',         3,  true),
(25,  'Desk',         3,  true),
(26,  'Desk',         3,  true),
(27,  'Desk',         3,  true),
(28,  'Desk',         3,  true),
(29,  'Meeting Room', 3,  true),
(30,  'Common Area',  3,  true),
-- HQ Tower, floor 4
(31,  'Desk',         4,  true),
(32,  'Desk',         4,  true),
(33,  'Desk',         4,  true),
(34,  'Desk',         4,  true),
(35,  'Desk',         4,  true),
(36,  'Desk',         4,  true),
(37,  'Desk',         4,  true),
(38,  'Desk',         4,  true),
(39,  'Meeting Room', 4,  true),
(40,  'Common Area',  4,  true),
-- North Campus, floor 1
(41,  'Desk',         5,  true),
(42,  'Desk',         5,  true),
(43,  'Desk',         5,  true),
(44,  'Desk',         5,  true),
(45,  'Desk',         5,  true),
(46,  'Desk',         5,  true),
(47,  'Desk',         5,  true),
(48,  'Desk',         5,  true),
(49,  'Meeting Room', 5,  true),
(50,  'Common Area',  5,  true),
-- North Campus, floor 2
(51,  'Desk',         6,  true),
(52,  'Desk',         6,  true),
(53,  'Desk',         6,  true),
(54,  'Desk',         6,  true),
(55,  'Desk',         6,  true),
(56,  'Desk',         6,  true),
(57,  'Desk',         6,  true),
(58,  'Desk',         6,  true),
(59,  'Meeting Room', 6,  true),
(60,  'Common Area',  6,  true),
-- North Campus, floor 3
(61,  'Desk',         7,  true),
(62,  'Desk',         7,  true),
(63,  'Desk',         7,  true),
(64,  'Desk',         7,  true),
(65,  'Desk',         7,  true),
(66,  'Desk',         7,  true),
(67,  'Desk',         7,  true),
(68,  'Desk',         7,  true),
(69,  'Meeting Room', 7,  true),
(70,  'Common Area',  7,  true),
-- North Campus, floor 4
(71,  'Desk',         8,  true),
(72,  'Desk',         8,  true),
(73,  'Desk',         8,  true),
(74,  'Desk',         8,  true),
(75,  'Desk',         8,  true),
(76,  'Desk',         8,  true),
(77,  'Desk',         8,  true),
(78,  'Desk',         8,  true),
(79,  'Meeting Room', 8,  true),
(80,  'Common Area',  8,  true),
-- Riverside Office, floor 1
(81,  'Desk',         9,  true),
(82,  'Desk',         9,  true),
(83,  'Desk',         9,  true),
(84,  'Desk',         9,  true),
(85,  'Desk',         9,  true),
(86,  'Desk',         9,  true),
(87,  'Desk',         9,  true),
(88,  'Desk',         9,  true),
(89,  'Meeting Room', 9,  true),
(90,  'Common Area',  9,  true),
-- Riverside Office, floor 2
(91,  'Desk',         10, true),
(92,  'Desk',         10, true),
(93,  'Desk',         10, true),
(94,  'Desk',         10, true),
(95,  'Desk',         10, true),
(96,  'Desk',         10, true),
(97,  'Desk',         10, true),
(98,  'Desk',         10, true),
(99,  'Meeting Room', 10, true),
(100, 'Common Area',  10, true),
-- Riverside Office, floor 3
(101, 'Desk',         11, true),
(102, 'Desk',         11, true),
(103, 'Desk',         11, true),
(104, 'Desk',         11, true),
(105, 'Desk',         11, true),
(106, 'Desk',         11, true),
(107, 'Desk',         11, true),
(108, 'Desk',         11, true),
(109, 'Meeting Room', 11, true),
(110, 'Common Area',  11, true),
-- Riverside Office, floor 4
(111, 'Desk',         12, true),
(112, 'Desk',         12, true),
(113, 'Desk',         12, true),
(114, 'Desk',         12, true),
(115, 'Desk',         12, true),
(116, 'Desk',         12, true),
(117, 'Desk',         12, true),
(118, 'Desk',         12, true),
(119, 'Meeting Room', 12, true),
(120, 'Common Area',  12, true),
-- Tech Center, floor 1
(121, 'Desk',         13, true),
(122, 'Desk',         13, true),
(123, 'Desk',         13, true),
(124, 'Desk',         13, true),
(125, 'Desk',         13, true),
(126, 'Desk',         13, true),
(127, 'Desk',         13, true),
(128, 'Desk',         13, true),
(129, 'Meeting Room', 13, true),
(130, 'Common Area',  13, true),
-- Tech Center, floor 2
(131, 'Desk',         14, true),
(132, 'Desk',         14, true),
(133, 'Desk',         14, true),
(134, 'Desk',         14, true),
(135, 'Desk',         14, true),
(136, 'Desk',         14, true),
(137, 'Desk',         14, true),
(138, 'Desk',         14, true),
(139, 'Meeting Room', 14, true),
(140, 'Common Area',  14, true),
-- Tech Center, floor 3
(141, 'Desk',         15, true),
(142, 'Desk',         15, true),
(143, 'Desk',         15, true),
(144, 'Desk',         15, true),
(145, 'Desk',         15, true),
(146, 'Desk',         15, true),
(147, 'Desk',         15, true),
(148, 'Desk',         15, true),
(149, 'Meeting Room', 15, true),
(150, 'Common Area',  15, true),
-- Tech Center, floor 4
(151, 'Desk',         16, true),
(152, 'Desk',         16, true),
(153, 'Desk',         16, true),
(154, 'Desk',         16, true),
(155, 'Desk',         16, true),
(156, 'Desk',         16, true),
(157, 'Desk',         16, true),
(158, 'Desk',         16, true),
(159, 'Meeting Room', 16, true),
(160, 'Common Area',  16, true),
-- Annex West, floor 1
(161, 'Desk',         17, true),
(162, 'Desk',         17, true),
(163, 'Desk',         17, true),
(164, 'Desk',         17, true),
(165, 'Desk',         17, true),
(166, 'Desk',         17, true),
(167, 'Desk',         17, true),
(168, 'Desk',         17, true),
(169, 'Meeting Room', 17, true),
(170, 'Common Area',  17, true),
-- Annex West, floor 2
(171, 'Desk',         18, true),
(172, 'Desk',         18, true),
(173, 'Desk',         18, true),
(174, 'Desk',         18, true),
(175, 'Desk',         18, true),
(176, 'Desk',         18, true),
(177, 'Desk',         18, true),
(178, 'Desk',         18, true),
(179, 'Meeting Room', 18, true),
(180, 'Common Area',  18, true),
-- Annex West, floor 3
(181, 'Desk',         19, true),
(182, 'Desk',         19, true),
(183, 'Desk',         19, true),
(184, 'Desk',         19, true),
(185, 'Desk',         19, true),
(186, 'Desk',         19, true),
(187, 'Desk',         19, true),
(188, 'Desk',         19, true),
(189, 'Meeting Room', 19, true),
(190, 'Common Area',  19, true),
-- Annex West, floor 4
(191, 'Desk',         20, true),
(192, 'Desk',         20, true),
(193, 'Desk',         20, true),
(194, 'Desk',         20, true),
(195, 'Desk',         20, true),
(196, 'Desk',         20, true),
(197, 'Desk',         20, true),
(198, 'Desk',         20, true),
(199, 'Meeting Room', 20, true),
(200, 'Common Area',  20, true);

-- -------------------------------------------------------------------------
-- Engineers (two per building)
-- -------------------------------------------------------------------------
INSERT INTO engineers (id, user_id, max_workload, building_id, is_active) VALUES
(1,  11, 5, 1, true),   -- Liam Ortiz,  HQ Tower
(2,  12, 5, 1, true),   -- Mia Patel,   HQ Tower
(3,  13, 5, 2, true),   -- Noah Reed,   North Campus
(4,  14, 5, 2, true),   -- Olivia Shaw, North Campus
(5,  15, 5, 3, true),   -- Paul Turner, Riverside Office
(6,  16, 5, 3, true),   -- Quinn Vega,  Riverside Office
(7,  17, 5, 4, true),   -- Ruby Walsh,  Tech Center
(8,  18, 5, 4, true),   -- Sam Young,   Tech Center
(9,  19, 5, 5, true),   -- Tara Zane,   Annex West
(10, 20, 5, 5, true);   -- Uma Bennett, Annex West
 
 
-- -------------------------------------------------------------------------
-- Tickets
-- -------------------------------------------------------------------------
INSERT INTO tickets (id, title, description, priority, status, issue_type, assigned_to_id, created_by_id, location_id, created_at, opened_at, closed_at) VALUES
(1,  'Air conditioning not working',        'No cool air coming from the vents near my desk since this morning.', 'Critical', 'In-Progress', 'Other',      1,    2,  24,  '2026-10-19 08:00:00', '2026-10-19 09:00:00', NULL),
(2,  'Monitor flickering',                  'External monitor flickers every few seconds when connected.',        'Medium',   'Open', 'Hardware',          NULL, 3,  2,   '2026-10-20 08:00:00', NULL,                  NULL),
(3,  'Wi-Fi drops in meeting room',         'Video calls disconnect every 10 minutes in this room.',              'Medium',   'Blocked', 'Network',        7,    4,  139, '2026-10-16 08:00:00', '2026-10-16 09:00:00', NULL),
(4,  'Broken desk chair',                   'Chair height lever is broken and the seat keeps sinking.',           'Low',      'Resolved', 'Structural',    3,    5,  46,  '2026-10-13 08:00:00', '2026-10-13 09:00:00', NULL),
(5,  'Leaking tap in kitchen',              'Kitchen tap drips constantly and water is pooling on the counter.',  'Medium',   'Closed', 'Plumbing',        4,    6,  80,  '2026-10-09 08:00:00', '2026-10-09 09:00:00', '2026-10-11 08:00:00'),
(6,  'Projector will not connect',          'Projector shows no signal with both HDMI and wireless casting.',     'Critical', 'In-Progress', 'Hardware',   5,    7,  109, '2026-10-20 08:00:00', '2026-10-20 09:00:00', NULL),
(7,  'Desk lamp not working',               'Desk lamp does not turn on; tried a new bulb already.',              'Low',      'Open', 'Hardware',          NULL, 8,  93,  '2026-10-21 06:00:00', NULL,                  NULL),
(8,  'Docking station not charging laptop', 'Laptop shows not charging when plugged into the dock.',              'Medium',   'In-Progress', 'Hardware',   8,    9,  125, '2026-10-18 08:00:00', '2026-10-18 09:00:00', NULL),
(9,  'Lights flickering in common area',    'Ceiling lights flicker constantly near the lounge area.',            'Medium',   'Closed', 'Structural',      9,    10, 180, '2026-10-06 08:00:00', '2026-10-06 09:00:00', '2026-10-08 08:00:00'),
(10, 'Badge reader faulty',                 'Badge reader at the floor entrance rejects valid badges.',           'Critical', 'Open', 'Hardware',          10,   2,  191, '2026-10-21 06:30:00', NULL,                  NULL);
 
 
-- -------------------------------------------------------------------------
-- Notes (written by each ticket's assigned engineer)
-- -------------------------------------------------------------------------
INSERT INTO notes (id, ticket_id, engineer_id, body) VALUES
(1,  1,  1,  'On site now. Compressor fault suspected, checking the unit on the roof.'),
(2,  1,  1,  'Replacement part ordered, temporary fan placed at your desk.'),
(3,  3,  7,  'Access point in this room is failing. Waiting on a replacement from IT stock.'),
(4,  3,  7,  'Replacement access point arrives Friday; ticket blocked until then.'),
(5,  4,  3,  'Replaced the gas lift on the chair. Please confirm it is working.'),
(6,  5,  4,  'Washer replaced and counter dried. No further leaks observed.'),
(7,  6,  5,  'Firmware update applied to the projector, testing HDMI input now.'),
(8,  8,  8,  'Swapped the dock power supply; monitoring for the rest of the day.'),
(9,  9,  9,  'Replaced two faulty light ballasts. Lights are stable.'),
(10, 10, 10, 'Will check the badge reader wiring first thing this morning.');
 
 
-- -------------------------------------------------------------------------
-- Move each ID counter past the inserted rows so new rows from the app
-- don't collide with the IDs above
-- -------------------------------------------------------------------------
SELECT setval(pg_get_serial_sequence('buildings', 'id'), (SELECT max(id) FROM buildings));
SELECT setval(pg_get_serial_sequence('floors',    'id'), (SELECT max(id) FROM floors));
SELECT setval(pg_get_serial_sequence('seats',     'id'), (SELECT max(id) FROM seats));
SELECT setval(pg_get_serial_sequence('users',     'id'), (SELECT max(id) FROM users));
SELECT setval(pg_get_serial_sequence('engineers', 'id'), (SELECT max(id) FROM engineers));
SELECT setval(pg_get_serial_sequence('tickets',   'id'), (SELECT max(id) FROM tickets));
SELECT setval(pg_get_serial_sequence('notes',     'id'), (SELECT max(id) FROM notes));
 
COMMIT;