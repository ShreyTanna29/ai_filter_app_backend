"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireApiKey = requireApiKey;
const prisma_1 = __importDefault(require("../lib/prisma"));
function extractApiKey(req) {
    // Header forms
    const headerKey = (req.header("x-api-key") ||
        req.header("x-apikey") ||
        "").trim();
    if (headerKey)
        return headerKey;
    const auth = (req.header("authorization") || "").trim();
    if (auth && auth.toLowerCase().startsWith("bearer ")) {
        return auth.slice(7).trim();
    }
    // Query forms
    const q = req.query;
    if (typeof (q === null || q === void 0 ? void 0 : q.api_key) === "string" && q.api_key.trim())
        return q.api_key.trim();
    if (typeof (q === null || q === void 0 ? void 0 : q.apiKey) === "string" && q.apiKey.trim())
        return q.apiKey.trim();
    return undefined;
}
function requireApiKey(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const provided = extractApiKey(req);
            const adminKeys = [
                process.env.ADMIN_API_KEY,
                process.env["admin_api_key"],
                process.env.ADMIN_KEY,
            ].filter(Boolean);
            if (provided && adminKeys.includes(provided)) {
                req.apiKeyOwner = { type: "admin" };
                next();
                return;
            }
            if (!provided) {
                res.status(401).json({ success: false, message: "Missing API key" });
                return;
            }
            const app = yield prisma_1.default.app.findFirst({
                where: { apiKey: provided, isActive: true },
            });
            if (!app) {
                res.status(401).json({ success: false, message: "Invalid API key" });
                return;
            }
            req.apiKeyOwner = { type: "app", app };
            next();
            return;
        }
        catch (e) {
            res
                .status(500)
                .json({ success: false, message: "API key validation failed" });
            return;
        }
    });
}
