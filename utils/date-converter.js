"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDate = parseDate;
const dayjs_1 = __importDefault(require("dayjs"));
function parseDate(strDate, format = "MMM D, YYYY") {
    return (0, dayjs_1.default)(strDate, format).toDate();
}
