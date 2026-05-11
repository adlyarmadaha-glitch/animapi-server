"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dayMap = void 0;
exports.convertDay = convertDay;
exports.dayMap = {
    monday: "senin",
    tuesday: "selasa",
    wednesday: "rabu",
    thursday: "kamis",
    friday: "jumat",
    saturday: "sabtu",
    sunday: "minggu",
    random: "random",
};
function convertDay(day) {
    const lower = day.toLowerCase();
    // English → Indonesian
    if (exports.dayMap[lower])
        return exports.dayMap[lower];
    // Indonesian → English
    const found = Object.entries(exports.dayMap).find(([, indo]) => indo === lower);
    if (found)
        return found[0];
    throw new Error(`Unknown day: ${day}`);
}
