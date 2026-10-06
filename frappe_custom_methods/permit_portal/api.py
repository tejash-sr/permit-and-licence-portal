# Copy this file into your custom Frappe app, e.g.:
#   apps/permit_portal/permit_portal/api.py
# and make sure the app is installed on the `operations` site so these
# whitelisted methods are reachable at:
#   POST /api/method/permit_portal.api.accept_review
#   POST /api/method/permit_portal.api.record_decision
#
# These exist because REST-level PUT requests against the Permit resource are
# NOT atomic across concurrent officers — two officers could both read
# assigned_officer=None, then both PUT their own ID, and both "win". The fix
# has to live in a single SQL statement on the ERPNext side.

import frappe
from frappe import _


@frappe.whitelist()
def accept_review(permit_id: str, officer_id: str):
	"""
	Atomically claims a Permit for review.

	The UPDATE is unconditional on the officer, but conditional on
	`assigned_officer IS NULL` in the WHERE clause — so it can only ever
	succeed once. Whichever request's UPDATE affects a row wins; every
	other concurrent request affects 0 rows and gets a 409 back.
	"""
	if not permit_id or not officer_id:
		frappe.throw(_("permit_id and officer_id are required"))

	with frappe.db.savepoint("accept_review"):
		affected = frappe.db.sql(
			"""
			UPDATE `tabPermit`
			SET assigned_officer = %(officer_id)s,
			    status = 'Under Review',
			    current_stage_status = 'Assigned',
			    modified = %(now)s
			WHERE name = %(permit_id)s
			  AND (assigned_officer IS NULL OR assigned_officer = '')
			""",
			{"officer_id": officer_id, "permit_id": permit_id, "now": frappe.utils.now()},
		)

	# frappe.db.sql for UPDATE doesn't return rowcount portably across drivers
	# in every Frappe version — re-check state instead, inside the same
	# transaction, so the read is consistent with the write above.
	current = frappe.db.get_value("Permit", permit_id, "assigned_officer")

	if current != officer_id:
		frappe.local.response.http_status_code = 409
		return {"claimed": False, "assigned_officer": current}

	frappe.db.commit()

	frappe.get_doc(
		{
			"doctype": "State Transition Log",
			"permit": permit_id,
			"old_state": "Submitted",
			"new_state": "Under Review",
			"transitioned_by": officer_id,
			"transition_date": frappe.utils.now(),
			"reason": "Claimed from review queue",
		}
	).insert(ignore_permissions=True)

	return {"claimed": True, "assigned_officer": officer_id}


@frappe.whitelist()
def record_decision(permit_id: str, officer_id: str, decision: str, remarks: str = ""):
	"""Records an officer's APPROVED / REJECTED / CONDITIONAL decision."""
	if decision not in ("APPROVED", "REJECTED", "CONDITIONAL"):
		frappe.throw(_("decision must be APPROVED, REJECTED, or CONDITIONAL"))

	permit = frappe.get_doc("Permit", permit_id)

	if permit.assigned_officer != officer_id:
		frappe.local.response.http_status_code = 403
		return {"error": "This case is not assigned to you"}

	status_map = {
		"APPROVED": "Approved",
		"REJECTED": "Rejected",
		"CONDITIONAL": "Conditional Approval",
	}
	old_status = permit.status
	permit.status = status_map[decision]
	permit.decision_remarks = remarks
	permit.final_decision_by = officer_id
	permit.final_decision_timestamp = frappe.utils.now()
	permit.save(ignore_permissions=True)

	frappe.get_doc(
		{
			"doctype": "State Transition Log",
			"permit": permit_id,
			"old_state": old_status,
			"new_state": permit.status,
			"transitioned_by": officer_id,
			"transition_date": frappe.utils.now(),
			"reason": remarks,
		}
	).insert(ignore_permissions=True)

	frappe.db.commit()
	return {"ok": True, "status": permit.status}
