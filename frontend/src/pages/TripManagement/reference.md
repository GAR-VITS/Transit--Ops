AIM PROMPT — TransitOps Trip Management
ACTION
Design a modern, responsive Trip Management screen for "TransitOps" that lets users create, view, dispatch, complete, and cancel trips, with all business rule validations enforced visually (cargo weight limits, vehicle/driver availability checks). This page is central to daily operations, primarily used by Drivers and Fleet Managers.
INPUT
Page-Level Role Visibility
RoleCan Access Page?PermissionsFleet Manager✅ YesFull access — view all trips, create, dispatch, complete, cancel any tripDriver✅ YesCan create trips, view their own assigned/created trips, mark their own trips as Dispatched/CompletedSafety Officer✅ YesView-only — sees all trips for compliance monitoring (e.g., checking assigned drivers' license validity), no create/edit actionsFinancial Analyst⚠️ LimitedView-only — sees trip list mainly for cost/distance context feeding reports, no create/edit actions

Annotate this on the Figma frame with a badge near the top: "Page visible to: All Roles | Create/Dispatch/Complete actions: Fleet Manager, Driver (own trips) only"

Top Bar

Page title: "Trip Management"
Primary button (top-right): "+ Create Trip" — opens Create Trip form
Annotate: "+ Create Trip" visible to Fleet Manager, Driver; hidden for Safety Officer, Financial Analyst

Search & Filter Bar

Search input: "Search by source, destination, driver, vehicle..." with search icon
Filter dropdown: Status (All / Draft / Dispatched / Completed / Cancelled)
Filter dropdown: Date Range picker
Toggle: "My Trips Only" — visible to Driver role only (filters to trips they created/are assigned to)

Trip List (Table / Card View)
Columns/fields per trip:

Trip ID (e.g., #1023)
Source → Destination (shown with a small route/arrow icon)
Vehicle (registration number)
Driver (name)
Cargo Weight (kg)
Planned Distance (km)
Status — colored pill badge (Grey = Draft, Blue = Dispatched, Green = Completed, Red = Cancelled)
Actions column — context-sensitive buttons based on current status (see workflow below)


Zebra-striped rows
Empty state: "No trips found. Click 'Create Trip' to get started." with illustration
Pagination controls at bottom

Trip Status Workflow (buttons shown per trip, contextual to current status)

Draft → show "Dispatch" button (only enabled if validations pass)
Dispatched → show "Complete" and "Cancel" buttons
Completed → no actions, view-only, shows a "View Summary" link
Cancelled → no actions, greyed out row

Create Trip Form (Slide-in Panel from right) — Fleet Manager, Driver only
Fields:

Source — text input or location picker, placeholder "Enter starting point"
Destination — text input or location picker, placeholder "Enter destination"
Vehicle — dropdown, only shows vehicles with Status = Available (real-time filtered list)
Driver — dropdown, only shows drivers with Status = Available and valid (non-expired) license (real-time filtered list)
Cargo Weight — number input, unit "kg" — shows inline validation: "⚠️ Exceeds vehicle's max capacity (500kg)" in red if weight entered exceeds the selected vehicle's Max Load Capacity
Planned Distance — number input, unit "km"
Form buttons: "Save as Draft" (secondary) and "Create & Dispatch" (primary — combines create + immediate dispatch if validations pass)
Validation summary banner (if any rule fails): "Cannot dispatch — cargo weight exceeds capacity" or "Selected driver's license has expired"

Complete Trip Form (Modal, triggered from "Complete" button)
Fields:

Final Odometer Reading — number input
Fuel Consumed — number input, unit "liters"
Notes (optional) — text area
Buttons: "Cancel" and "Mark as Completed"
Info note: "Completing this trip will automatically set Vehicle and Driver status back to Available"

Cancel Trip Confirmation (small modal)

Message: "Cancel this trip? Vehicle and Driver will be restored to Available."
Buttons: "Go Back" and "Confirm Cancel"

Validation Rules Enforced Visually (must be clearly shown in design)

Vehicle dropdown excludes Retired/In Shop/On Trip vehicles
Driver dropdown excludes Suspended/expired-license/On Trip drivers
Cargo weight field shows real-time red error if it exceeds selected vehicle's capacity
"Create & Dispatch" / "Dispatch" button is disabled (greyed) until all validations pass

Visual Style

Same established palette: Deep blue/navy (#1E3A5F) primary, white/light-grey background
Status pill colors: Grey (Draft), Blue (Dispatched), Green (Completed), Red (Cancelled)
Error/validation states in red with warning icon
Typography: clean sans-serif (Inter), bold table headers
Table: 12px row padding, rounded 12px card container, soft shadow

METHOD
Build this as a full-width data table layout consistent with the Vehicle Registry and Driver Management pages (same table style, same slide-in panel pattern from the right, 400-480px wide). Use a separate small centered modal (not slide-in) for the Complete Trip and Cancel Trip confirmations, since these are quick contextual actions rather than full forms. Make dropdown fields (Vehicle, Driver) show real-time filtered results with a small helper text below each ("Showing only available vehicles/drivers"). Clearly annotate role-based restrictions and validation logic directly in the design using small tags/notes. Maintain 8px spacing grid, WCAG AA contrast, rounded 8px inputs, and full responsiveness across mobile (375px), tablet (768px), desktop (1440px).