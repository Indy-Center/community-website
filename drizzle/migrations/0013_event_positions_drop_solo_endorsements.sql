-- The training app no longer has the solo endorsements APP-SOLO and TWR-SOLO: stop positions asking
-- for them. Every other code stays, in its order.
UPDATE `event_positions`
SET `required_endorsements` = (
	SELECT json_group_array(`value`)
	FROM (
		SELECT `value` FROM json_each(`event_positions`.`required_endorsements`) ORDER BY `key`
	)
	WHERE `value` NOT IN ('APP-SOLO', 'TWR-SOLO')
)
WHERE EXISTS (
	SELECT 1 FROM json_each(`event_positions`.`required_endorsements`)
	WHERE `value` IN ('APP-SOLO', 'TWR-SOLO')
);
