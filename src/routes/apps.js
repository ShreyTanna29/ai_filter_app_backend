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
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
function generateApiKey() {
    return crypto_1.default.randomBytes(32).toString("hex");
}
// List apps (requires API key)
router.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const apps = yield prisma_1.default.app.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ success: true, apps });
}));
// Create app (requires API key or ADMIN_API_KEY)
router.post("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = req.body;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
        res.status(400).json({ success: false, message: "name is required" });
        return;
    }
    try {
        const apiKey = generateApiKey();
        const app = yield prisma_1.default.app.create({ data: { name, apiKey } });
        res.status(201).json({ success: true, app });
    }
    catch (e) {
        const err = e;
        if ((err === null || err === void 0 ? void 0 : err.code) === "P2002") {
            res
                .status(409)
                .json({ success: false, message: "App name already exists" });
            return;
        }
        res.status(500).json({ success: false, message: "Failed to create app" });
    }
}));
// Rotate key (requires API key)
router.post("/:id/rotate", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const idNum = Number(req.params.id);
    if (Number.isNaN(idNum) || idNum <= 0) {
        res.status(400).json({ success: false, message: "invalid id" });
        return;
    }
    const apiKey = generateApiKey();
    try {
        const app = yield prisma_1.default.app.update({
            where: { id: idNum },
            data: { apiKey },
        });
        res.json({ success: true, app });
    }
    catch (e) {
        res.status(404).json({ success: false, message: "App not found" });
    }
}));
// Delete app (requires API key)
router.delete("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const idNum = Number(req.params.id);
    if (Number.isNaN(idNum) || idNum <= 0) {
        res.status(400).json({ success: false, message: "invalid id" });
        return;
    }
    try {
        yield prisma_1.default.app.delete({ where: { id: idNum } });
        res.json({ success: true });
    }
    catch (e) {
        res.status(404).json({ success: false, message: "App not found" });
    }
}));
exports.default = router;
