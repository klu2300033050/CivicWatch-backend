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
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http"));
const database_1 = require("./config/database");
const app_1 = __importDefault(require("./app"));
const socket_1 = require("./socket");
dotenv_1.default.config({ path: "./.env" });
const PORT = process.env.PORT || 3000;
// Create HTTP server so Socket.io can attach
const server = http_1.default.createServer(app_1.default);
(0, socket_1.initSocket)(server);
// For standalone server (Local development)
if (process.env.NODE_ENV !== "production") {
    (0, database_1.connectDB)()
        .then(() => {
        server.listen(PORT, () => {
            console.log(`🚀 Server is running on port: ${PORT}`);
        });
    })
        .catch((error) => {
        console.error("MongoDB connection failed!\n", error);
        process.exit(1);
    });
}
// For Serverless environments (Vercel)
const handler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, database_1.connectDB)();
        return (0, app_1.default)(req, res);
    }
    catch (error) {
        console.error("Serverless handle error:", error);
        res.status(500).json({ message: "Internal Server Error - Database connection failed" });
    }
});
exports.default = handler;
