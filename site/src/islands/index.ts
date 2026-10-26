// Server-side handles for the islands; each wraps the component in its hydration marker.
import { island } from "./island";
import RoomC from "./Room.vue";
import LabSearchC from "./LabSearch.vue";
import WorkbenchSearchC from "./WorkbenchSearch.vue";
import AchievementCollectionC from "./AchievementCollection.vue";
import ShiftCalendarC from "./ShiftCalendar.vue";
import AdminDeskC from "./AdminDesk.vue";

export const Room = island("Room", RoomC);
export const LabSearch = island("LabSearch", LabSearchC);
export const WorkbenchSearch = island("WorkbenchSearch", WorkbenchSearchC);
export const AchievementCollection = island("AchievementCollection", AchievementCollectionC);
export const ShiftCalendar = island("ShiftCalendar", ShiftCalendarC);
export const AdminDesk = island("AdminDesk", AdminDeskC);
